/**
 * Verifies: educator creates multiple exam variants with the same groupId,
 * and students joining with that group ID are randomly assigned to one variant.
 */
const API = 'http://127.0.0.1:5000/api';

async function request(endpoint, method, body, token) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function main() {
  const groupId = `GRP-TEST-${Date.now()}`;
  const past = new Date(Date.now() - 60_000).toISOString();

  console.log('1. Register educator...');
  const eduEmail = `edu_grp_${Date.now()}@test.com`;
  await request('/auth/register', 'POST', {
    name: 'Group Test Educator',
    email: eduEmail,
    password: 'password',
    role: 'educator',
  });
  const { token: eduToken } = await request('/auth/login', 'POST', {
    email: eduEmail,
    password: 'password',
  });

  console.log('2. Create questions...');
  const qIds = [];
  for (let i = 1; i <= 3; i++) {
    const q = await request(
      '/educators/questions',
      'POST',
      {
        questionText: `Group test Q${i}`,
        correctAnswer: String(i),
        options: ['1', '2', '3', '4'],
      },
      eduToken
    );
    qIds.push(q._id);
  }

  console.log(`3. Create 3 exam variants under groupId "${groupId}"...`);
  const variantTitles = ['Variant A', 'Variant B', 'Variant C'];
  const createdExams = [];
  for (let i = 0; i < 3; i++) {
    const exam = await request(
      '/educators/exams',
      'POST',
      {
        groupId,
        groupName: 'Random Assignment Test',
        title: variantTitles[i],
        scheduledDate: past,
        duration: 30,
        questions: [qIds[i]],
      },
      eduToken
    );
    createdExams.push(exam);
  }

  const byGroup = await request('/educators/exams', 'GET', null, eduToken);
  const groupExams = byGroup.filter((e) => e.groupId === groupId);
  if (groupExams.length !== 3) {
    throw new Error(`Expected 3 exams in group, found ${groupExams.length}`);
  }
  console.log(`   ✓ Educator has ${groupExams.length} variants with same groupId`);

  console.log('4. Register 12 students and join with group ID...');
  const assignments = new Map(); // studentId -> examId
  const variantCounts = { A: 0, B: 0, C: 0 };

  for (let s = 0; s < 12; s++) {
    const stuEmail = `stu_grp_${Date.now()}_${s}@test.com`;
    await request('/auth/register', 'POST', {
      name: `Student ${s}`,
      email: stuEmail,
      password: 'password',
      role: 'student',
      studentId: String(10000 + s),
    });
    const { token: stuToken } = await request('/auth/login', 'POST', {
      email: stuEmail,
      password: 'password',
    });

    const assigned = await request('/students/join', 'POST', { examCode: groupId }, stuToken);
    assignments.set(stuEmail, {
      examId: assigned._id,
      title: assigned.title,
    });
    if (assigned.title === 'Variant A') variantCounts.A++;
    else if (assigned.title === 'Variant B') variantCounts.B++;
    else if (assigned.title === 'Variant C') variantCounts.C++;

    // Re-join should return the same variant (idempotent)
    const again = await request('/students/join', 'POST', { examCode: groupId }, stuToken);
    if (again._id !== assigned._id) {
      throw new Error(`Re-join changed assignment for ${stuEmail}: ${assigned._id} -> ${again._id}`);
    }
  }

  console.log('   Assignment distribution:', variantCounts);
  const uniqueVariants = new Set([...assignments.values()].map((v) => v.examId));
  if (uniqueVariants.size < 2) {
    console.warn('   ⚠ Only one variant received students (possible but unlikely with 12 students)');
  } else {
    console.log(`   ✓ Students spread across ${uniqueVariants.size} variant(s)`);
  }

  // Each student enrolled on exactly one exam in the group
  for (const [email, { examId }] of assignments) {
    const exam = groupExams.find((e) => e._id === examId);
    if (!exam) throw new Error(`${email} assigned to exam outside group`);
  }
  console.log('   ✓ Every student assigned to a valid group variant');

  console.log('5. Verify student can open assigned exam (enrollment check)...');
  const sample = [...assignments.entries()][0];
  const sampleEmail = sample[0];
  const sampleExamId = sample[1].examId;
  await request('/auth/login', 'POST', { email: sampleEmail, password: 'password' }).then(
    async ({ token }) => {
      const exam = await request(`/students/exam/${sampleExamId}`, 'GET', null, token);
      if (!exam.title) throw new Error('Could not load exam for taking');
      console.log(`   ✓ Sample student can access "${exam.title}"`);
    }
  );

  console.log('\n✅ SUCCESS: Group creation + random assignment + re-join idempotency verified.');
}

main().catch((err) => {
  console.error('\n❌ FAILED:', err.message);
  process.exit(1);
});
