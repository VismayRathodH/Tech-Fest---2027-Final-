import jsPDF from 'jspdf';

export interface SlipData {
  registration_id: string;
  name: string;
  email: string;
  phone: string;
  college_id: string;
  team_name: string;
  registration_type: string;
  registration_fee: number;
  status: string;
  registered_at: string;
  reviewed_at: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  department_name: string;
  department_code: string;
  members: {
    member_name: string;
    email: string;
    phone: string;
    college_id: string;
    member_order: number;
  }[];
}

export function generateRegistrationSlip(data: SlipData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const centerText = (text: string, yPos: number, size: number = 12) => {
    doc.setFontSize(size);
    doc.text(text, pageWidth / 2, yPos, { align: 'center' });
  };

  const leftText = (label: string, value: string, yPos: number) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 75, yPos);
  };

  const drawLine = (yPos: number) => {
    doc.setDrawColor(100, 100, 200);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
  };

  // Header
  doc.setFillColor(67, 56, 202); // indigo-700
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  centerText('TECHFEST 2026', y, 22);
  y += 8;
  centerText('College Event Management System', y, 11);
  y += 10;
  centerText('REGISTRATION SLIP', y, 14);
  y += 15;

  doc.setTextColor(0, 0, 0);

  // Registration info box
  doc.setFillColor(240, 240, 255);
  doc.roundedRect(15, y, pageWidth - 30, 22, 3, 3, 'F');
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Registration No: ${data.registration_id}`, 20, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const statusColor = data.status === 'confirmed' ? [22, 163, 74] : [200, 100, 0]; // green or orange
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`Status: ${data.status.toUpperCase()}`, 20, y);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - 20, y, { align: 'right' });
  y += 12;

  // Event Details
  drawLine(y);
  y += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text('EVENT DETAILS', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  leftText('Event:', data.event_title, y);
  y += 7;
  leftText('Department:', `${data.department_name} (${data.department_code})`, y);
  y += 7;
  leftText('Date:', new Date(data.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), y);
  y += 7;
  leftText('Time:', data.event_time, y);
  y += 7;
  leftText('Venue:', data.event_location, y);
  y += 7;
  leftText('Type:', data.registration_type.charAt(0).toUpperCase() + data.registration_type.slice(1), y);
  y += 7;
  if (data.registration_fee > 0) {
    leftText('Fee:', `₹${data.registration_fee}`, y);
    y += 7;
  }
  y += 3;

  // Participant Details
  drawLine(y);
  y += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text('PARTICIPANT DETAILS', 20, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  if (data.team_name) {
    leftText('Team Name:', data.team_name, y);
    y += 10;
  }

  // Primary registrant
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Primary Contact:', 20, y);
  y += 7;
  leftText('  Name:', data.name, y);
  y += 6;
  leftText('  Email:', data.email, y);
  y += 6;
  leftText('  Phone:', data.phone, y);
  y += 6;
  if (data.college_id) {
    leftText('  College ID:', data.college_id, y);
    y += 6;
  }
  y += 4;

  // Team members
  if (data.members && data.members.length > 0) {
    for (const member of data.members) {
      if (member.member_order === 1) continue; // Skip primary (already shown)

      // Check if we need a new page
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`Member ${member.member_order}:`, 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      leftText('  Name:', member.member_name, y);
      y += 6;
      if (member.email) {
        leftText('  Email:', member.email, y);
        y += 6;
      }
      if (member.phone) {
        leftText('  Phone:', member.phone, y);
        y += 6;
      }
      if (member.college_id) {
        leftText('  College ID:', member.college_id, y);
        y += 6;
      }
      y += 4;
    }
  }

  // Footer notes
  y += 5;
  drawLine(y);
  y += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text('IMPORTANT NOTES', 20, y);
  doc.setTextColor(100, 100, 100);
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const notes = [
    '• Please carry this slip (printed or digital) to the event venue.',
    '• This is a computer-generated document and does not require a signature.',
    `• Approved on: ${data.reviewed_at ? new Date(data.reviewed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}`,
    '• For any queries, contact the event coordinator or admin.',
  ];
  for (const note of notes) {
    doc.text(note, 20, y);
    y += 6;
  }

  // Bottom bar
  doc.setFillColor(67, 56, 202);
  doc.rect(0, doc.internal.pageSize.getHeight() - 10, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('TechFest 2026 - College Event Management System', pageWidth / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });

  doc.save(`Registration-Slip-${data.registration_id}.pdf`);
}
