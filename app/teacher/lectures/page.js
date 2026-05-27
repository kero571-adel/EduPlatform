// /app/teacher/lectures/page.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Video, 
  Trash2, 
  Play, 
  Clock, 
  FileVideo, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Loader2,
  Plus,
  List,
  Grid,
  Search,
  MoreVertical,
  Eye
} from 'lucide-react';

export default function TeacherLectures() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  // States
  const [lectures, setLectures] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('list');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  // Auth & Fetch
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return router.replace('/login');
      fetchLectures(user.uid);
    });
    return () => unsub();
  }, [router]);

  const fetchLectures = async (teacherId) => {
    try {
      const q = query(
        collection(db, 'lectures'),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setLectures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching lectures:', err);
      setError('Failed to load lectures');
    }
  };

  // File Handlers
  const handleFileChange = (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }
    
    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      setError('File size must be less than 500MB');
      return;
    }
    
    setVideoFile(file);
    setError('');
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, []);

  // Upload Handler
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!videoFile || !title) {
      setError('Please fill all required fields');
      return;
    }

    setUploading(true);
    setError('');
    
    try {
      const timestamp = Date.now();
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${auth.currentUser.uid}/${timestamp}.${fileExt}`;
      
      const storageRef = ref(storage, `lectures/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, videoFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          setError('Upload failed. Please try again.');
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          await addDoc(collection(db, 'lectures'), {
            title,
            description,
            videoUrl: downloadURL,
            fileName: videoFile.name,
            fileSize: videoFile.size,
            duration: null, // Can add video metadata later
            teacherId: auth.currentUser.uid,
            createdAt: serverTimestamp()
          });

          // Reset form
          setTitle('');
          setDescription('');
          setVideoFile(null);
          setUploadProgress(0);
          setActiveTab('list');
          fetchLectures(auth.currentUser.uid);
        }
      );
    } catch (err) {
      console.error('Error uploading lecture:', err);
      setError('Error uploading lecture');
    } finally {
      setUploading(false);
    }
  };

  // Delete Handler
  const handleDelete = async (lectureId, videoUrl) => {
    if (!confirm('Are you sure you want to delete this lecture?')) return;
    
    setDeletingId(lectureId);
    try {
      // Delete from Storage
      const storageRef = ref(storage, videoUrl);
      await deleteObject(storageRef).catch(() => {}); // Ignore if not found
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'lectures', lectureId));
      
      // Update local state
      setLectures(prev => prev.filter(l => l.id !== lectureId));
    } catch (err) {
      console.error('Error deleting lecture:', err);
      setError('Failed to delete lecture');
    } finally {
      setDeletingId(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.min(parseInt(Math.floor(Math.log(bytes) / Math.log(1024))), sizes.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Filter lectures
  const filteredLectures = lectures.filter(lecture => 
    lecture.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lecture.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Drop Zone Component
  const DropZone = () => (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        dragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
        className="hidden"
      />
      
      <motion.div
        animate={{ scale: dragActive ? 1.05 : 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
          dragActive ? 'bg-blue-100' : 'bg-gray-100'
        }`}>
          <Upload className={`w-8 h-8 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        
        <div>
          <p className="font-medium text-gray-800">
            {dragActive ? 'Drop your video here' : 'Drag & drop your video'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or <span className="text-blue-600 font-medium">browse files</span>
          </p>
        </div>
        
        <p className="text-xs text-gray-400">
          Supports: MP4, WebM, MOV • Max: 500MB
        </p>
      </motion.div>
    </div>
  );

  // File Preview Component
  const FilePreview = () => {
    if (!videoFile) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4"
      >
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileVideo className="w-6 h-6 text-blue-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 truncate">{videoFile.name}</p>
          <p className="text-sm text-gray-500">{formatFileSize(videoFile.size)}</p>
        </div>
        
        <button
          type="button"
          onClick={() => { setVideoFile(null); setError(''); }}
          className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </motion.div>
    );
  };

  // Lecture Card Component (Grid View)
  const LectureCard = ({ lecture, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all group"
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        <video 
          src={lecture.videoUrl} 
          className="w-full h-full object-cover"
          preload="metadata"
        />
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center hover:scale-105 transition-transform">
            <Play className="w-6 h-6 text-gray-800 ml-1" />
          </button>
        </div>
        
        {/* Delete Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(lecture.id, lecture.videoUrl); }}
          disabled={deletingId === lecture.id}
          className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all disabled:opacity-50"
          title="Delete lecture"
        >
          {deletingId === lecture.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-1">{lecture.title}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{lecture.description}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(lecture.createdAt)}</span>
          </div>
          <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
            {formatFileSize(lecture.fileSize)}
          </span>
        </div>
      </div>
    </motion.div>
  );

  // Lecture Row Component (List View)
  const LectureRow = ({ lecture, index }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all group"
    >
      {/* Thumbnail */}
      <div className="relative w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        <video src={lecture.videoUrl} className="w-full h-full object-cover" preload="metadata" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Play className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-800 truncate">{lecture.title}</h3>
        <p className="text-sm text-gray-500 truncate">{lecture.description}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(lecture.createdAt)}
          </span>
          <span>•</span>
          <span>{formatFileSize(lecture.fileSize)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <a
          href={lecture.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Open in new tab"
        >
          <Eye className="w-5 h-5" />
        </a>
        <button
          onClick={() => handleDelete(lecture.id, lecture.videoUrl)}
          disabled={deletingId === lecture.id}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Delete"
        >
          {deletingId === lecture.id ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Trash2 className="w-5 h-5" />
          )}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lectures Management</h1>
          <p className="text-gray-500 mt-1">Upload and manage your video lectures</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Lecture</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'list' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          My Lectures
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'upload' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Upload New
        </button>
      </div>

      {/* Upload Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Upload New Lecture</h2>
            
            <form onSubmit={handleUpload} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lecture Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Introduction to Physics - Chapter 1"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                  disabled={uploading}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this lecture..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  disabled={uploading}
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video File <span className="text-red-500">*</span>
                </label>
                <DropZone />
                <FilePreview />
              </div>

              {/* Progress Bar */}
              {uploadProgress > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Uploading...</span>
                    <span className="font-medium text-blue-600">{uploadProgress.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    />
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploading || !videoFile || !title}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload Lecture
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List Tab */}
      {activeTab === 'list' && (
        <motion.div
          key="list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Search & View Toggle */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search lectures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lectures Grid/List */}
          {filteredLectures.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 bg-white rounded-2xl border border-gray-200"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {searchQuery ? 'No matching lectures' : 'No lectures yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Try a different search term' : 'Upload your first lecture to get started'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  Upload Lecture
                </button>
              )}
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLectures.map((lecture, index) => (
                <LectureCard key={lecture.id} lecture={lecture} index={index} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLectures.map((lecture, index) => (
                <LectureRow key={lecture.id} lecture={lecture} index={index} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}