const mongoose = require('mongoose');

async function test() {
  const API = 'http://localhost:5000/api';
  
  const request = async (endpoint, method, body, token) => {
    const res = await fetch(`${API}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  };

  try {
    console.log("1. Registering test educator...");
    const eduEmail = `edu_${Date.now()}@test.com`;
    await request('/auth/register', 'POST', { name: 'Test Edu', email: eduEmail, password: 'password', role: 'educator' });
    
    const eduRes = await request('/auth/login', 'POST', { email: eduEmail, password: 'password' });
    const eduToken = eduRes.token;
    
    console.log("2. Registering test student...");
    const stuEmail = `stu_${Date.now()}@test.com`;
    await request('/auth/register', 'POST', { name: 'Test Stu', email: stuEmail, password: 'password', role: 'student', studentId: Math.floor(10000 + Math.random() * 90000).toString() });
    
    const stuRes = await request('/auth/login', 'POST', { email: stuEmail, password: 'password' });
    const stuToken = stuRes.token;
    
    console.log("3. Educator creating question and exam...");
    const qRes = await request('/educators/questions', 'POST', {
      questionText: 'What is 2+2?',
      correctAnswer: '4',
      options: ['3', '4', '5', '6']
    }, eduToken);
    const qId = qRes._id;
    
    const groupCode = `TEST_GRP_${Date.now()}`;
    const eRes = await request('/educators/exams', 'POST', {
      groupId: groupCode,
      title: 'Monitoring Test Exam',
      scheduledDate: new Date(Date.now() - 10000).toISOString(),
      duration: 10,
      questions: [qId]
    }, eduToken);
    const examId = eRes._id;
    
    console.log("4. Student enrolling and starting monitoring...");
    // Enroll via joinExam
    await request('/students/join', 'POST', { examCode: groupCode }, stuToken);

    // Get Exam
    await request(`/students/exam/${examId}`, 'GET', null, stuToken);

    // Start Monitoring
    const monStartRes = await request('/monitoring/start', 'POST', { examId }, stuToken);

    console.log("5. Student triggering tab switch violation...");
    await request('/monitoring/tab-switch', 'POST', { examId }, stuToken);
    
    console.log("6. Student ending monitoring and submitting exam...");
    await request('/monitoring/end', 'POST', { examId }, stuToken);
    
    await request(`/students/submit/${examId}`, 'POST', {
      answers: { [qId]: '4' },
      timeTracker: { [qId]: 5 },
      cancelledDueToViolation: true
    }, stuToken);
    
    console.log("7. Verifying Result document cancelled status...");
    const results = await request('/students/results', 'GET', null, stuToken);
    const resultObj = results.find(r => r.exam?._id === examId);
    if (resultObj && resultObj.cancelledDueToViolation === true) {
      console.log("✅ SUCCESS! Result marked as cancelled due to violation in DB.");
    } else {
      console.log("❌ FAILED: Result was not marked as cancelled due to violation in DB.", resultObj);
    }

    console.log("8. Educator fetching monitoring data...");
    const monFetchRes = await request(`/monitoring/exam/${examId}`, 'GET', null, eduToken);
    
    const sessions = monFetchRes;
    if (sessions.length > 0 && sessions[0].violations.length > 0) {
      console.log(`✅ SUCCESS! Found ${sessions[0].violations.length} violations for student.`);
      console.log("Violation details:", sessions[0].violations[0].type);
      console.log("Session status:", sessions[0].status);
    } else {
      console.log("❌ FAILED: No violations found in educator dashboard.");
      console.log("Sessions data:", JSON.stringify(sessions));
    }

  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

test();
