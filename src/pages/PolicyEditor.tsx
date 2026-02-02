import React, { useState } from 'react';
import { Eye, Save } from 'lucide-react';

const ToggleSwitch = ({ enabled, setEnabled }: { enabled: boolean, setEnabled: (enabled: boolean) => void }) => (
    <button
      type="button"
      className={`${
        enabled ? 'bg-indigo-600' : 'bg-gray-200'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
      onClick={() => setEnabled(!enabled)}
    >
      <span
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
);

interface PolicyEditorProps {
  title: string;
  hasSectionSelector?: boolean;
  hasPublishToggle?: boolean;
}

const PolicyEditor: React.FC<PolicyEditorProps> = ({ title, hasSectionSelector, hasPublishToggle }) => {
  const [content, setContent] = useState('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.');
  const [section, setSection] = useState('User');
  const [isPublished, setIsPublished] = useState(true);
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">Last updated: 13 Jan 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsPreview(!isPreview)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            <Eye className="w-4 h-4" />
            {isPreview ? 'Edit' : 'Preview'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm hover:shadow-lg">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {hasSectionSelector && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <select value={section} onChange={e => setSection(e.target.value)} className="w-full md:w-1/3 border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition">
                <option>User</option>
                <option>LSP</option>
              </select>
            </div>
          )}

          {hasPublishToggle && (
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{isPublished ? 'Published' : 'Draft'}</span>
                <ToggleSwitch enabled={isPublished} setEnabled={setIsPublished} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            {isPreview ? (
              <div className="prose prose-sm max-w-none p-4 border border-gray-200 rounded-lg bg-gray-50 min-h-[300px]" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
            ) : (
              <textarea
                rows={15}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Enter policy content here..."
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition font-mono text-sm leading-6"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyEditor;