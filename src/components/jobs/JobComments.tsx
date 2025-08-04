import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';

interface Comment {
  id: string;
  job_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_email?: string;
}

interface JobCommentsProps {
  jobId: string;
  jobDivision?: string;
}

export default function JobComments({ jobId, jobDivision }: JobCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Determine which schema to use based on division
  const isLabDivision = jobDivision?.toLowerCase() === 'calibration' || jobDivision?.toLowerCase() === 'armadillo';
  const schema = isLabDivision ? 'lab_ops' : 'neta_ops';
  const table = 'job_comments';

  useEffect(() => {
    fetchComments();
  }, [jobId, schema]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .schema(schema)
        .from(table)
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // For now, just use the comments without trying to fetch user emails
      // This avoids potential auth admin API issues
      const commentsWithUsers = (data || []).map(comment => ({
        ...comment,
        user_email: comment.user_id === user?.id ? (user?.email || 'You') : 'User'
      }));

      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !user) return;

    try {
      setSubmitting(true);

      const { data, error } = await supabase
        .schema(schema)
        .from(table)
        .insert({
          job_id: jobId,
          user_id: user.id,
          comment: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new comment to the list with user email
      const newCommentWithUser: Comment = {
        ...data,
        user_email: user.email || 'Unknown User'
      };

      setComments(prev => [...prev, newCommentWithUser]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MessageCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Comments</h3>
        </div>
        <div className="text-center text-gray-500 dark:text-gray-400">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <MessageCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Comments</h3>
        {comments.length > 0 && (
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
            {comments.length}
          </span>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            No comments yet. Be the first to add one!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {comment.user_email}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.comment}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                disabled={submitting}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4 mr-1" />
                  {submitting ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
