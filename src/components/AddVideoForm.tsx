import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, Plus, Check } from 'lucide-react';

interface AddVideoFormProps {
  onSave: (url: string, tag: string) => void;
  isLoading: boolean;
  isSuccess: boolean;
}

export const AddVideoForm: React.FC<AddVideoFormProps> = ({
  onSave,
  isLoading,
  isSuccess
}) => {
  const [url, setUrl] = useState('');
  const [tag, setTag] = useState('');

  // Clear form when success state changes
  useEffect(() => {
    if (isSuccess) {
      setUrl('');
      setTag('');
    }
  }, [isSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && tag.trim()) {
      onSave(url.trim(), tag.trim());
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Adding...
        </>
      );
    }
    if (isSuccess) {
      return (
        <>
          <Check className="h-3 w-3" />
          Added
        </>
      );
    }
    return (
      <>
        <Plus className="h-3 w-3" />
        Add
      </>
    );
  };

  return (
    <div className="space-y-2 mb-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex space-x-2">
          <Input
            type="url"
            placeholder="YouTube URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="flex-1 text-sm"
          />
          <Input
            type="text"
            placeholder="Tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            disabled={isLoading}
            className="w-20 text-sm"
          />
          <Button 
            type="submit" 
            size="sm"
            disabled={!url.trim() || !tag.trim() || isLoading}
            className="px-3"
          >
            {getButtonContent()}
          </Button>
        </div>
      </form>
    </div>
  );
};