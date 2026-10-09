import { useEffect, useRef, useState } from 'react';
import { ACCEPT_ATTRIBUTE, validateImageMeta } from '../../shared/imagePolicy.js';

/**
 * 이미지 선택 + 미리보기. 형식·용량을 선택 즉시 검사하고, 통과한 파일만 onChange로 넘긴다.
 * @param {{file: File | null, onChange: (file: File | null) => void, disabled?: boolean}} props
 */
export default function ImageUpload({ file, onChange, disabled }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      if (inputRef.current) inputRef.current.value = '';
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleSelect(event) {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return;
    const check = validateImageMeta(selected);
    if (!check.ok) {
      setError(check.message);
      event.target.value = '';
      onChange(null);
      return;
    }
    setError('');
    onChange(selected);
  }

  return (
    <div className="image-upload">
      <label className="file-label">
        풀이 사진 첨부 (PNG/JPG/WEBP, 최대 5MB)
        <input ref={inputRef} type="file" accept={ACCEPT_ATTRIBUTE} onChange={handleSelect} disabled={disabled} />
      </label>
      {error && <p className="error">{error}</p>}
      {previewUrl && (
        <div className="preview">
          <img src={previewUrl} alt="첨부 이미지 미리보기" />
          <button type="button" onClick={() => onChange(null)} disabled={disabled}>
            첨부 취소
          </button>
        </div>
      )}
    </div>
  );
}
