import * as XLSX from 'xlsx';

/**
 * Generate and download Excel template for quiz questions
 */
export const downloadQuizTemplate = () => {
  // Create sample data following the Vietnamese template format
  const templateData = [
    // Header row
    ['Tên câu hỏi', 'Đáp án đúng', 'Số điểm', 'Đáp án 1', 'Đáp án 2', 'Đáp án 3', 'Đáp án 4'],
    
    // Sample rows
    [
      'Trong phần tích công việc, một "danh từ, động từ định danh cho một đầu việc cụ thể, giúp phân biệt rõ ràng',
      1,
      1,
      'Tên công việc',
      'Mục tiêu của công việc',
      'Hoạt động cần tiến hành để thực thi công việc',
      'Tên công việc và Mục tiêu của công việc'
    ],
    [
      'Trong phần tích công việc, thuật ngữ "Các nguồn lực cần huy động" là gì?',
      3,
      1,
      'Danh từ, động từ định danh cái gì thể được làm ra khi một hoạt động kết thúc, một công việc dược hoàn tất',
      'Tình từ, động từ xác định tình chất, đặc điểm cần đạt của sản phẩm - kết quả đầu ra của công việc',
      'Danh từ, động từ chỉ những điều kiện cần thiết về con người và phương tiện vật chất',
      'Động từ, động từ chỉ nội dung hành động cụ thể, được lựa chọn trên cơ sở công việc cần làm và mục tiêu cần đạt'
    ],
    [
      '"Quy trình thu thập, đánh giá và tổ chức thông tin môi cách',
      2,
      1,
      'Phân công công việc',
      'Phân tích công việc',
      'Quản trị công việc',
      'Triển khai công việc'
    ]
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // Set column widths
  const columnWidths = [
    { wch: 60 }, // Tên câu hỏi - wide column
    { wch: 12 }, // Đáp án đúng
    { wch: 10 }, // Số điểm
    { wch: 30 }, // Đáp án 1
    { wch: 30 }, // Đáp án 2
    { wch: 30 }, // Đáp án 3
    { wch: 30 }  // Đáp án 4
  ];
  ws['!cols'] = columnWidths;

  // Style header row
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    
    ws[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E8F4FD' } },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    };
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Câu hỏi trắc nghiệm');

  // Generate file
  const fileName = `Template_Cau_Hoi_Trac_Nghiem_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
};

export default {
  downloadQuizTemplate
};