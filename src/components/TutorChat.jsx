import { useState } from 'react';
import { api } from '../lib/client.js';
import ImageUpload from './ImageUpload.jsx';

const MODE_OPTIONS = [
  { id: 'hint', label: '힌트만 (스스로 풀기)' },
  { id: 'solution', label: '단계별 풀이' },
];

export default function TutorChat({ subjectId }) {
  const [mode, setMode] = useState('hint');
  const [question, setQuestion] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending || (!question.trim() && !imageFile)) return;
    setPending(true);
    setError('');
    const userText = question.trim() || '(이미지 첨부)';
    try {
      const result = await api.askTutor({ subjectId, mode, question, history: messages, imageFile });
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: userText, hasImage: Boolean(imageFile) },
        { role: 'assistant', content: result.reply, refused: result.refused, truncated: result.truncated },
      ]);
      setQuestion('');
      setImageFile(null);
    } catch (err) {
      // 실패 시 입력과 첨부 파일을 유지해 바로 다시 보낼 수 있게 한다.
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="tutor-chat sheet">
      <div className="mode-picker">
        {MODE_OPTIONS.map((m) => (
          <label key={m.id}>
            <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} />
            {m.label}
          </label>
        ))}
      </div>

      <ol className="messages">
        {messages.map((m, i) => (
          <li key={i} className={`message ${m.role}`}>
            <strong>{m.role === 'user' ? '나' : '튜터'}</strong>
            {m.hasImage && <span className="badge">이미지 첨부</span>}
            <p>{m.content}</p>
            {m.truncated && <p className="notice">답변이 길어 중간에 잘렸습니다.</p>}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="질문을 입력하세요. 예: 이 보의 반력을 구할 때 모멘트 기준점은 어디로 잡나요?"
          rows={4}
          disabled={pending}
        />
        <ImageUpload file={imageFile} onChange={setImageFile} disabled={pending} />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary-button" disabled={pending || (!question.trim() && !imageFile)}>
          {pending ? '답변 생성 중…' : '질문하기'}
        </button>
      </form>
    </section>
  );
}
