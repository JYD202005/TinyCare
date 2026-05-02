import React from 'react';

interface WebDatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

// This is a dummy component for native platforms.
// The real implementation is in WebDatePicker.web.tsx and is automatically loaded by Expo on the Web.
export default function WebDatePicker(props: WebDatePickerProps) {
  return null;
}
