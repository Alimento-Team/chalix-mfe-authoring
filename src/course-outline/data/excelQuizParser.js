import * as XLSX from 'xlsx';

/**
 * Parse Excel quiz file according to the Vietnamese template format
 * Expected columns: Tên câu hỏi, Đáp án đúng, Số điểm, Đáp án 1, Đáp án 2, Đáp án 3, Đáp án 4
 */
export const parseQuizExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('File Excel phải có ít nhất 1 dòng dữ liệu sau header');
        }
        
        // Parse header row to find column indices
        const headerRow = jsonData[0];
        const columnMap = parseHeaderColumns(headerRow);
        
        // Parse quiz data rows
        const quizzes = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (isRowEmpty(row)) continue;
          
          try {
            const quiz = parseQuizRow(row, columnMap, i + 1);
            if (quiz) {
              quizzes.push(quiz);
            }
          } catch (error) {
            console.warn(`Skipping row ${i + 1}: ${error.message}`);
          }
        }
        
        if (quizzes.length === 0) {
          throw new Error('Không tìm thấy câu hỏi hợp lệ nào trong file Excel');
        }
        
        resolve({
          success: true,
          quizzes,
          summary: {
            totalRows: jsonData.length - 1,
            validQuizzes: quizzes.length,
            fileName: file.name
          }
        });
        
      } catch (error) {
        console.error('Excel parsing error:', error);
        reject({
          success: false,
          error: error.message,
          details: error
        });
      }
    };
    
    reader.onerror = () => {
      reject({
        success: false,
        error: 'Không thể đọc file Excel'
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parse header row to find column indices
 */
const parseHeaderColumns = (headerRow) => {
  const columnMap = {};
  
  headerRow.forEach((header, index) => {
    if (!header) return;
    
    const normalizedHeader = String(header).toLowerCase().trim();
    
    // Map Vietnamese column headers to internal keys
    if (normalizedHeader.includes('tên câu hỏi') || normalizedHeader.includes('câu hỏi')) {
      columnMap.question = index;
    } else if (normalizedHeader.includes('đáp án đúng')) {
      columnMap.correctAnswer = index;
    } else if (normalizedHeader.includes('số điểm') || normalizedHeader.includes('điểm')) {
      columnMap.points = index;
    } else if (normalizedHeader.includes('đáp án 1')) {
      columnMap.answer1 = index;
    } else if (normalizedHeader.includes('đáp án 2')) {
      columnMap.answer2 = index;
    } else if (normalizedHeader.includes('đáp án 3')) {
      columnMap.answer3 = index;
    } else if (normalizedHeader.includes('đáp án 4')) {
      columnMap.answer4 = index;
    }
  });
  
  // Validate required columns
  const requiredColumns = ['question', 'correctAnswer', 'answer1'];
  const missingColumns = requiredColumns.filter(col => columnMap[col] === undefined);
  
  if (missingColumns.length > 0) {
    throw new Error(`Thiếu các cột bắt buộc: ${missingColumns.join(', ')}. Vui lòng kiểm tra template Excel.`);
  }
  
  return columnMap;
};

/**
 * Parse a single quiz row
 */
const parseQuizRow = (row, columnMap, rowNumber) => {
  const questionText = getCellValue(row, columnMap.question);
  const correctAnswerNumber = getCellValue(row, columnMap.correctAnswer);
  const points = getCellValue(row, columnMap.points) || 1;
  
  if (!questionText) {
    throw new Error(`Câu hỏi không được để trống`);
  }
  
  // Collect answer choices
  const choices = [];
  const answerColumns = ['answer1', 'answer2', 'answer3', 'answer4'];
  
  answerColumns.forEach((answerKey, index) => {
    if (columnMap[answerKey] !== undefined) {
      const answerText = getCellValue(row, columnMap[answerKey]);
      if (answerText) {
        choices.push({
          text: String(answerText).trim(),
          index: index + 1,
          is_correct: false
        });
      }
    }
  });
  
  if (choices.length < 2) {
    throw new Error(`Phải có ít nhất 2 đáp án`);
  }
  
  // Set correct answer
  const correctAnswerIndex = parseCorrectAnswer(correctAnswerNumber, choices.length);
  if (correctAnswerIndex < 1 || correctAnswerIndex > choices.length) {
    throw new Error(`Đáp án đúng phải là số từ 1 đến ${choices.length}`);
  }
  
  // Mark the correct choice
  choices[correctAnswerIndex - 1].is_correct = true;
  
  return {
    question_text: String(questionText).trim(),
    question_type: 'single_choice', // Based on template, only one correct answer
    points: Number(points) || 1,
    choices: choices.map(choice => ({
      text: choice.text,
      is_correct: choice.is_correct
    })),
    rowNumber
  };
};

/**
 * Get cell value safely
 */
const getCellValue = (row, columnIndex) => {
  if (columnIndex === undefined || !row || row[columnIndex] === undefined) {
    return null;
  }
  const value = row[columnIndex];
  return value === null || value === undefined ? null : String(value).trim();
};

/**
 * Parse correct answer number
 */
const parseCorrectAnswer = (correctAnswerValue, maxChoices) => {
  if (!correctAnswerValue) {
    throw new Error('Đáp án đúng không được để trống');
  }
  
  const parsed = parseInt(String(correctAnswerValue).trim(), 10);
  if (isNaN(parsed)) {
    throw new Error('Đáp án đúng phải là số');
  }
  
  return parsed;
};

/**
 * Check if row is empty
 */
const isRowEmpty = (row) => {
  return !row || row.every(cell => !cell || String(cell).trim() === '');
};

/**
 * Generate quiz data compatible with existing quiz system
 */
export const convertToQuizFormat = (parsedQuizzes, courseId, unitId) => {
  return {
    course_key: courseId,
    parent_locator: unitId,
    quiz_title: `Bài kiểm tra cuối khóa (${parsedQuizzes.length} câu hỏi)`,
    quiz_description: 'Bài kiểm tra được tạo từ file Excel',
    questions: parsedQuizzes
  };
};

/**
 * Create individual quizzes for each question (if needed for compatibility)
 */
export const createIndividualQuizzes = async (parsedQuizzes, courseId, unitId, createQuizFunction) => {
  const results = [];
  
  for (let i = 0; i < parsedQuizzes.length; i++) {
    const quiz = parsedQuizzes[i];
    
    try {
      const quizRequest = {
        course_key: courseId,
        parent_locator: unitId,
        quiz_title: `Câu ${i + 1}: ${quiz.question_text.substring(0, 50)}${quiz.question_text.length > 50 ? '...' : ''}`,
        quiz_description: `Câu hỏi thứ ${i + 1} từ file Excel`,
        questions: [quiz]
      };
      
      const response = await createQuizFunction(quizRequest);
      results.push({
        success: true,
        quiz: response.quiz,
        originalIndex: i
      });
      
    } catch (error) {
      console.error(`Failed to create quiz ${i + 1}:`, error);
      results.push({
        success: false,
        error: error.message,
        originalIndex: i
      });
    }
  }
  
  return results;
};

export default {
  parseQuizExcel,
  convertToQuizFormat,
  createIndividualQuizzes
};