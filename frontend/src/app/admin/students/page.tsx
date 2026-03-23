'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Upload, UserPlus, Filter, Pencil, X, Loader2 } from 'lucide-react';

interface Student {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
  batch: string;
  mobileNumber: string;
  createdAt: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [batch, setBatch] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [batches, setBatches] = useState<string[]>([]);
  const [filterBatch, setFilterBatch] = useState('');

  // Edit state
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editBatch, setEditBatch] = useState('');
  const [editMobileNumber, setEditMobileNumber] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      const params = filterBatch ? `?batch=${encodeURIComponent(filterBatch)}` : '';
      const res = await api.get(`/admin/students${params}`);
      setStudents(res.data.students);
    } catch {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [filterBatch]);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/admin/students/batches');
      setBatches(res.data.batches);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, [fetchStudents]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/students', { name, email, password, rollNumber, batch, mobileNumber });
      toast.success('Student created successfully!');
      setName(''); setEmail(''); setPassword(''); setRollNumber(''); setBatch(''); setMobileNumber('');
      setShowForm(false);
      fetchStudents();
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/admin/students/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message);
      if (res.data.errors?.length > 0) {
        res.data.errors.slice(0, 5).forEach((err: any) => toast.error(`Row ${err.row}: ${err.error}`));
      }
      fetchStudents();
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openEdit = (s: Student) => {
    setEditStudent(s);
    setEditName(s.name);
    setEditEmail(s.email);
    setEditRollNumber(s.rollNumber);
    setEditBatch(s.batch || '');
    setEditMobileNumber(s.mobileNumber || '');
    setEditPassword('');
  };

  const closeEdit = () => {
    setEditStudent(null);
    setEditPassword('');
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setSaving(true);
    try {
      const payload: any = {
        name: editName,
        email: editEmail,
        rollNumber: editRollNumber,
        batch: editBatch,
        mobileNumber: editMobileNumber,
      };
      if (editPassword) payload.password = editPassword;

      await api.put(`/admin/students/${editStudent._id}`, payload);
      toast.success('Student updated successfully!');
      closeEdit();
      fetchStudents();
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload CSV/Excel'}
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreateStudent} className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Student</h3>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            <input type="text" placeholder="Roll Number" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            <input type="text" placeholder="Batch (e.g. 2024-A)" value={batch} onChange={(e) => setBatch(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
            <input type="text" placeholder="Mobile Number" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
          </div>
          <button type="submit" disabled={submitting}
            className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Student'}
          </button>
        </form>
      )}

      {/* Batch filter */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        >
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{students.length} students</span>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-16 border border-gray-100" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No students found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Batch</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Mobile</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{s.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{s.rollNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{s.batch || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{s.mobileNumber || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => openEdit(s)} className="text-indigo-600 hover:text-indigo-800 transition-colors" title="Edit student">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-700">
          <strong>CSV/Excel Format:</strong> Columns: <code className="bg-blue-100 px-1 rounded">name, email, password, rollnumber, batch, mobilenumber</code>
        </p>
      </div>

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-lg font-bold text-gray-900">Edit Student</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateStudent} className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Roll Number</label>
                  <input type="text" value={editRollNumber} onChange={(e) => setEditRollNumber(e.target.value)} required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Batch</label>
                  <input type="text" value={editBatch} onChange={(e) => setEditBatch(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number</label>
                  <input type="text" value={editMobileNumber} onChange={(e) => setEditMobileNumber(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">New Password <span className="text-gray-400">(leave blank to keep)</span></label>
                  <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} minLength={6} placeholder="••••••"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeEdit}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
