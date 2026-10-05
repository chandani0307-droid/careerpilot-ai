import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const ResumePage = () => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing profile on page mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.get('/profile');
      if (data) setProfile(data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Backend ko send karo
      const res = await api.upload<any>('/resume/upload', file);
      // Backend return value se profile immediately update karo
      setProfile(res);
    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.message || 'Resume upload karne me error aaya.');
    } finally {
      setLoading(false);
      // Input event ko reset karo taaki same file dubara select ki ja sake
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Resume Upload</h1>

      <div className="border-2 border-dashed border-gray-300 p-8 rounded-lg text-center">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileUpload}
          id="resume-file-input"
          className="hidden"
          disabled={loading}
        />
        <label
          htmlFor="resume-file-input"
          className="cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-md inline-block font-semibold hover:bg-blue-700"
        >
          {loading ? 'Uploading & Parsing...' : 'Select Resume (.pdf, .docx, .txt)'}
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {profile && (
        <div className="mt-6 p-6 bg-white shadow rounded-md border">
          <h2 className="text-lg font-bold text-green-600 mb-2">
            ✅ Resume Uploaded: {profile.filename}
          </h2>
          <p className="text-sm text-gray-500">
            Parsed Characters: {profile.resume_chars}
          </p>
        </div>
      )}
    </div>
  );
};