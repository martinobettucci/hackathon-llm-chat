import React from 'react';
import { GradientText } from '../UI/GradientText';

export function WelcomeMessage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-cyan-50 to-purple-50">
      <div className="text-center p-8 bg-white rounded-3xl shadow-xl border-2 border-gradient-to-r from-teal-200 to-purple-200">
        <div className="text-6xl mb-4">🤖</div>
        <h3 className="text-2xl font-bold mb-3">
          <GradientText from="teal-600" to="purple-600">
            Welcome to Your AI Assistant!
          </GradientText>
        </h3>
        <p className="text-gray-600 text-lg">
          🌟 Ready to chat? Select a conversation or start a new one! 
        </p>
      </div>
    </div>
  );
}