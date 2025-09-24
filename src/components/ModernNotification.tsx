import React, { useEffect } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ModernNotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose: () => void;
  show: boolean;
}

const ModernNotification: React.FC<ModernNotificationProps> = ({
  type,
  message,
  duration = 3000,
  onClose,
  show,
}) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-right-full duration-300">
      <Alert variant={getVariant()}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <AlertDescription className="flex-1">{message}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-2 -mt-1"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </Alert>
    </div>
  );
};

export default ModernNotification;
