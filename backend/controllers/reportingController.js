const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Feedback = require('../models/Feedback');
const Issue = require('../models/Issue');
const User = require('../models/User');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// @desc   Get Analytics Dashboard Data
// @route  GET /api/reports/analytics
// @access Private (educator)
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    const educatorId = req.user.id;
    
    // Fetch all exams by this educator
    const exams = await Exam.find({ educator: educatorId });
    const examIds = exams.map(e => e._id);

    // 1. Performance Trends (Average Score per Exam)
    const results = await Result.find({ exam: { $in: examIds } }).populate('exam', 'title scheduledDate');
    
    const performanceTrends = {};
    results.forEach(r => {
      const examName = r.exam?.title || 'Unknown';
      if (!performanceTrends[examName]) {
        performanceTrends[examName] = { totalScore: 0, count: 0, date: r.exam?.scheduledDate };
      }
      performanceTrends[examName].totalScore += (r.percentage || 0);
      performanceTrends[examName].count += 1;
    });

    const trendData = Object.keys(performanceTrends).map(name => ({
      name,
      avgScore: performanceTrends[name].count > 0 ? (performanceTrends[name].totalScore / performanceTrends[name].count).toFixed(2) : 0,
      date: performanceTrends[name].date
    })).sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort chronologically

    // 2. Issue Analysis (Breakdown by Category)
    const issues = await Issue.find({ examId: { $in: examIds } });
    const issueCounts = {
      Technical: 0,
      Content: 0,
      Accessibility: 0,
      Other: 0
    };
    issues.forEach(issue => {
      if (issueCounts[issue.category] !== undefined) {
        issueCounts[issue.category] += 1;
      } else {
        issueCounts.Other += 1;
      }
    });

    const issueData = Object.keys(issueCounts).map(name => ({
      name,
      value: issueCounts[name]
    }));

    // 3. Feedback Average Rating
    const feedbacks = await Feedback.find({ examId: { $in: examIds } });
    const avgRating = feedbacks.length > 0 
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) 
      : 0;

    // 4. Data-Driven Insights
    const insights = [];
    if (trendData.length >= 2) {
      const latest = trendData[trendData.length - 1].avgScore;
      const previous = trendData[trendData.length - 2].avgScore;
      if (latest > previous) {
        insights.push(`Class performance improved by ${(latest - previous).toFixed(2)}% in the latest exam.`);
      } else if (latest < previous) {
        insights.push(`Class performance dropped by ${(previous - latest).toFixed(2)}% in the latest exam. Consider reviewing the difficulty.`);
      }
    }
    
    if (issueCounts.Technical > 5) {
      insights.push(`High number of technical issues reported (${issueCounts.Technical}). Please verify platform stability during exams.`);
    }

    if (avgRating > 0 && avgRating < 3) {
      insights.push(`Average student feedback rating is low (${avgRating} / 5). Review student comments for improvement areas.`);
    }

    if (insights.length === 0) {
      insights.push("Performance is stable and no critical issues detected.");
    }

    res.json({
      trendData,
      issueData,
      avgRating,
      totalExams: exams.length,
      totalStudents: results.length, // total submissions
      insights
    });

  } catch (err) {
    console.error('getAnalyticsDashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Export Report
// @route  GET /api/reports/export/:examId?format=pdf|excel
// @access Private (educator)
exports.exportReport = async (req, res) => {
  try {
    const { examId } = req.params;
    const { format } = req.query; // 'pdf' or 'excel'
    const educatorId = req.user.id;

    const exam = await Exam.findOne({ _id: examId, educator: educatorId });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const results = await Result.find({ exam: examId }).populate('student', 'name studentId email');
    const feedbacks = await Feedback.find({ examId }).populate('studentId', 'name studentId');
    const issues = await Issue.find({ examId }).populate('studentId', 'name studentId');

    const averageScore = results.length > 0
      ? (results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length).toFixed(1)
      : 0;

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Exam Management System';

      // Sheet 1: Results
      const resultsSheet = workbook.addWorksheet('Student Results');
      resultsSheet.columns = [
        { header: 'Student ID', key: 'studentId', width: 20 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Score', key: 'score', width: 15 },
        { header: 'Percentage (%)', key: 'percentage', width: 15 },
        { header: 'Submitted At', key: 'submittedAt', width: 25 },
      ];

      results.forEach(r => {
        resultsSheet.addRow({
          studentId: r.student?.studentId || '—',
          name: r.student?.name || 'Unknown',
          email: r.student?.email || '—',
          score: `${r.score}/${r.totalQuestions}`,
          percentage: r.percentage,
          submittedAt: new Date(r.submittedAt).toLocaleString()
        });
      });

      // Sheet 2: Feedback
      const feedbackSheet = workbook.addWorksheet('Student Feedback');
      feedbackSheet.columns = [
        { header: 'Student Name', key: 'name', width: 30 },
        { header: 'Rating (1-5)', key: 'rating', width: 15 },
        { header: 'Comments', key: 'comments', width: 50 },
        { header: 'Date', key: 'date', width: 25 },
      ];

      feedbacks.forEach(f => {
        feedbackSheet.addRow({
          name: f.studentId?.name || 'Anonymous',
          rating: f.rating,
          comments: f.comments || '',
          date: new Date(f.createdAt).toLocaleString()
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=Exam_Report_${examId}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();

    } else if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Exam_Report_${examId}.pdf`);
      
      doc.pipe(res);

      // Title
      doc.fontSize(20).text(`Exam Report: ${exam.title}`, { align: 'center' });
      doc.moveDown();
      
      // Summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(12).text(`Total Students: ${results.length}`);
      doc.text(`Average Score: ${averageScore}%`);
      doc.text(`Date Generated: ${new Date().toLocaleString()}`);
      doc.moveDown();

      // Results Table (Simple text-based table)
      doc.fontSize(14).text('Student Results', { underline: true });
      doc.moveDown(0.5);
      
      results.forEach((r, i) => {
        const studentId = r.student?.studentId ? `(${r.student.studentId})` : '';
        const name = r.student?.name || 'Unknown';
        doc.fontSize(10).text(`${i + 1}. ${name} ${studentId} - Score: ${r.score}/${r.totalQuestions} (${r.percentage}%)`);
      });
      
      doc.moveDown();

      // Feedback Summary
      doc.fontSize(14).text('Feedback Summary', { underline: true });
      doc.moveDown(0.5);
      const avgRating = feedbacks.length > 0 
        ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) 
        : 0;
      doc.fontSize(12).text(`Average Rating: ${avgRating} / 5`);
      doc.fontSize(10).text(`Total Feedbacks: ${feedbacks.length}`);
      doc.moveDown();

      // Issues Summary
      doc.fontSize(14).text('Reported Issues', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Total Issues: ${issues.length}`);
      issues.forEach((issue, i) => {
        doc.fontSize(10).text(`${i + 1}. [${issue.category}] - ${issue.status}`);
      });

      doc.end();

    } else {
      res.status(400).json({ message: 'Invalid format specified. Use pdf or excel.' });
    }

  } catch (err) {
    console.error('exportReport error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
