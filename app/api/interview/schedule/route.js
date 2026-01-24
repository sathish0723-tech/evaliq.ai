import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
    try {
        const interviewData = await request.json();

        // TODO: Save interview to database
        // Example: await saveInterviewToDatabase(interviewData);

        // Generate meeting link
        const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview?join=${interviewData.roomName}`;

        // Send email notification
        await sendInterviewEmail(interviewData, meetingLink);

        return NextResponse.json({
            success: true,
            message: 'Interview scheduled and email sent successfully',
            interview: interviewData,
        });
    } catch (error) {
        console.error('Error scheduling interview:', error);
        return NextResponse.json(
            { error: 'Failed to schedule interview', details: error.message },
            { status: 500 }
        );
    }
}

async function sendInterviewEmail(interviewData, meetingLink) {
    // Create transporter using Gmail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Your Gmail address
            pass: process.env.EMAIL_APP_PASSWORD, // Gmail App Password (not regular password)
        },
    });

    // Format date and time
    const interviewDate = new Date(`${interviewData.date}T${interviewData.time}`);
    const formattedDate = interviewDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = interviewDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });

    // Email HTML template
    const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #0070f3;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #0070f3;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .details {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Interview Scheduled</h1>
        </div>
        <div class="content">
          <p>Dear ${interviewData.candidateName},</p>
          
          <p>We are pleased to inform you that your interview has been scheduled for the <strong>${interviewData.position}</strong> position.</p>
          
          <div class="details">
            <h3>Interview Details:</h3>
            <p><strong>Position:</strong> ${interviewData.position}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Duration:</strong> ${interviewData.duration} minutes</p>
            <p><strong>Interviewer:</strong> ${interviewData.interviewer}</p>
          </div>
          
          <p>Please join the video interview using the button below:</p>
          
          <center>
            <a href="${meetingLink}" class="button">Join Interview</a>
          </center>
          
          <p><small>Or copy this link: ${meetingLink}</small></p>
          
          <p>Please ensure:</p>
          <ul>
            <li>You have a stable internet connection</li>
            <li>Your camera and microphone are working</li>
            <li>You're in a quiet environment</li>
            <li>You join 5 minutes before the scheduled time</li>
          </ul>
          
          <p>If you have any questions or need to reschedule, please contact us at ${process.env.EMAIL_USER}.</p>
          
          <p>Best regards,<br>The Hiring Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    // Send email
    const mailOptions = {
        from: `"Hiring Team" <${process.env.EMAIL_USER}>`,
        to: interviewData.email,
        subject: `Interview Scheduled - ${interviewData.position} Position`,
        html: emailHTML,
        text: `
      Dear ${interviewData.candidateName},
      
      Your interview has been scheduled for the ${interviewData.position} position.
      
      Date: ${formattedDate}
      Time: ${formattedTime}
      Duration: ${interviewData.duration} minutes
      Interviewer: ${interviewData.interviewer}
      
      Meeting Link: ${meetingLink}
      
      Best regards,
      The Hiring Team
    `,
    };

    await transporter.sendMail(mailOptions);
}
