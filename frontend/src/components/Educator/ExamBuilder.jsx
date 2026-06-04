import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';

const generateGroupId = () => `GRP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const ExamBuilder = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupId, setGroupId] = useState(generateGroupId());
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [variantTitle, setVariantTitle] = useState('');
  const [variantDescription, setVariantDescription] = useState('');
  const [variantScheduledDate, setVariantScheduledDate] = useState('');
  const [variantDuration, setVariantDuration] = useState(60);
  const [variantQuestions, setVariantQuestions] = useState([]);
  const [variants, setVariants] = useState([]);
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    subject: '',
    topic: '',
    difficulty: 'medium',
    options: ['', '', '', ''],
    correctAnswer: '',
  });
  const [editQuestionId, setEditQuestionId] = useState(null);
  const [questionLoading, setQuestionLoading] = useState(false);

  useEffect(() => {
    refreshQuestions();
  }, []);

  const refreshQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/educators/questions');
      setQuestions(res.data);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      alert(err.response?.data?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('option-')) {
      const index = Number(name.split('-')[1]);
      const options = [...questionForm.options];
      options[index] = value;
      setQuestionForm({ ...questionForm, options });
      return;
    }
    setQuestionForm({ ...questionForm, [name]: value });
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.questionText || !questionForm.correctAnswer) {
      return alert('Question and correct answer are required.');
    }

    setQuestionLoading(true);
    try {
      if (editQuestionId) {
        await api.put(`/educators/questions/${editQuestionId}`, questionForm);
      } else {
        await api.post('/educators/questions', questionForm);
      }
      setQuestionForm({
        questionText: '',
        subject: '',
        topic: '',
        difficulty: 'medium',
        options: ['', '', '', ''],
        correctAnswer: '',
      });
      setEditQuestionId(null);
      await refreshQuestions();
    } catch (err) {
      console.error('Failed to save question:', err);
      alert(err.response?.data?.message || 'Failed to save question');
    } finally {
      setQuestionLoading(false);
    }
  };

  const editQuestion = (question) => {
    setEditQuestionId(question._id);
    setQuestionForm({
      questionText: question.questionText || '',
      subject: question.subject || '',
      topic: question.topic || '',
      difficulty: question.difficulty || 'medium',
      options: question.options?.length === 4 ? question.options : ['', '', '', ''],
      correctAnswer: question.correctAnswer || '',
    });
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    setQuestionLoading(true);
    try {
      await api.delete(`/educators/questions/${id}`);
      await refreshQuestions();
    } catch (err) {
      console.error('Failed to delete question:', err);
      alert(err.response?.data?.message || 'Failed to delete question');
    } finally {
      setQuestionLoading(false);
    }
  };

  const toggleVariantQuestion = (id) => {
    setVariantQuestions((prev) =>
      prev.includes(id) ? prev.filter((qid) => qid !== id) : [...prev, id]
    );
  };

  const addVariant = () => {
    if (!variantTitle || !variantScheduledDate || !variantDuration || variantQuestions.length === 0) {
      return alert('Please complete variant details and select questions.');
    }
    setVariants((prev) => [
      ...prev,
      {
        title: variantTitle,
        description: variantDescription,
        scheduledDate: variantScheduledDate,
        duration: Number(variantDuration),
        questions: variantQuestions,
      },
    ]);
    setVariantTitle('');
    setVariantDescription('');
    setVariantScheduledDate('');
    setVariantDuration(60);
    setVariantQuestions([]);
  };

  const removeVariant = (index) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const finalizeGroup = async () => {
    if (!groupName || !variants.length) {
      return alert('Please set a group name and add at least one exam variant.');
    }

    setLoading(true);
    try {
      await api.post('/educators/exams/group', {
        groupId,
        groupName,
        groupDescription,
        exams: variants,
      });
      alert('Exam group created successfully');
      navigate('/educator/exams');
    } catch (err) {
      console.error('Failed to create exam group:', err);
      alert(err.response?.data?.message || 'Failed to create exam group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <div className="page-title">
        <div>
          <h3>Create Exam Group</h3>
          <p>Build multiple exam variants under a single ID for random student assignment.</p>
        </div>
      </div>

      <div className="panel-form">
        <h4>Group Details</h4>
        <div className="form-grid">
          <div className="form-row">
            <input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="Group ID" />
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group Name" />
          </div>
          <div className="form-row">
            <textarea
              rows="3"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Group description"
            />
          </div>
        </div>
      </div>

      <div className="panel-form">
        <h4>Question Bank</h4>
        <form onSubmit={saveQuestion}>
          <div className="form-grid">
            <div className="form-row">
              <input name="questionText" value={questionForm.questionText} onChange={handleQuestionChange} placeholder="Question text" required />
            </div>
            <div className="form-row">
              <input name="subject" value={questionForm.subject} onChange={handleQuestionChange} placeholder="Subject" />
              <input name="topic" value={questionForm.topic} onChange={handleQuestionChange} placeholder="Topic" />
            </div>
            <div className="form-row">
              <select name="difficulty" value={questionForm.difficulty} onChange={handleQuestionChange}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <input name="correctAnswer" value={questionForm.correctAnswer} onChange={handleQuestionChange} placeholder="Correct answer" required />
            </div>
            <div className="form-row">
              <input name="option-0" value={questionForm.options[0]} onChange={handleQuestionChange} placeholder="Option 1" />
              <input name="option-1" value={questionForm.options[1]} onChange={handleQuestionChange} placeholder="Option 2" />
            </div>
            <div className="form-row">
              <input name="option-2" value={questionForm.options[2]} onChange={handleQuestionChange} placeholder="Option 3" />
              <input name="option-3" value={questionForm.options[3]} onChange={handleQuestionChange} placeholder="Option 4" />
            </div>
          </div>
          <div className="form-row">
            <button type="submit" className="button button--primary" disabled={questionLoading}>
              {questionLoading ? 'Saving...' : editQuestionId ? 'Update Question' : 'Add Question'}
            </button>
            {editQuestionId && (
              <button type="button" className="button button--secondary" onClick={() => {
                setEditQuestionId(null);
                setQuestionForm({
                  questionText: '', subject: '', topic: '', difficulty: 'medium', options: ['', '', '', ''], correctAnswer: '',
                });
              }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <p>Loading question bank...</p>
        ) : (
          <div className="card-list">
            {questions.map((question) => (
              <div key={question._id} className="card">
                <h4>{question.questionText}</h4>
                <p>{question.subject || 'General'} / {question.topic || 'Unspecified'} / {question.difficulty}</p>
                <p><strong>Correct:</strong> {question.correctAnswer}</p>
                <div className="card-footer">
                  <button className="button button--secondary" onClick={() => editQuestion(question)}>Edit</button>
                  <button className="button button--danger" onClick={() => deleteQuestion(question._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-form">
        <h4>Create Exam Variant</h4>
        <div className="form-grid">
          <div className="form-row">
            <input value={variantTitle} onChange={(e) => setVariantTitle(e.target.value)} placeholder="Variant title" />
            <input type="datetime-local" value={variantScheduledDate} onChange={(e) => setVariantScheduledDate(e.target.value)} />
          </div>
          <div className="form-row">
            <input type="number" min="10" value={variantDuration} onChange={(e) => setVariantDuration(e.target.value)} placeholder="Duration (minutes)" />
            <input value={variantDescription} onChange={(e) => setVariantDescription(e.target.value)} placeholder="Variant notes" />
          </div>
        </div>
        <div className="question-selector">
          {questions.map((question) => (
            <label key={question._id} className="question-item">
              <input type="checkbox" checked={variantQuestions.includes(question._id)} onChange={() => toggleVariantQuestion(question._id)} />
              <span>{question.questionText}</span>
            </label>
          ))}
        </div>
        <div className="form-row">
          <button type="button" className="button button--primary" onClick={addVariant}>Add Exam Variant</button>
        </div>
      </div>

      <div className="panel-form">
        <h4>Variants in Group ({variants.length})</h4>
        {variants.length === 0 ? (
          <p>No variants added yet.</p>
        ) : (
          <div className="card-list">
            {variants.map((variant, index) => (
              <div key={index} className="card">
                <h4>{variant.title}</h4>
                <p>{variant.description}</p>
                <p><strong>Scheduled:</strong> {new Date(variant.scheduledDate).toLocaleString()}</p>
                <p><strong>Duration:</strong> {variant.duration} minutes</p>
                <p><strong>Questions:</strong> {variant.questions.length}</p>
                <div className="card-footer">
                  <button className="button button--danger" onClick={() => removeVariant(index)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="form-row">
          <button type="button" className="button button--success" onClick={finalizeGroup} disabled={loading || variants.length === 0}>
            {loading ? 'Creating group...' : 'Finalize exam group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamBuilder;
