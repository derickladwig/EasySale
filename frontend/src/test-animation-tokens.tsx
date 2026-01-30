/**
 * Test file to verify animation tokens from task 1.5
 * This file demonstrates the usage of the new animation tokens added to Tailwind config
 * 
 * Requirements validated:
 * - 17.1: Duration tokens (fast: 150ms, normal: 300ms, slow: 500ms)
 * - 17.2: Easing functions (ease-out for entrances, ease-in for exits)
 * - 17.3: Transition utilities
 * - 17.4: Reduced-motion support
 */

import React from 'react';

export function AnimationTokensTest() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-h1 font-semibold text-text-primary">Animation Tokens Test</h1>
      
      {/* Duration Tokens (Req 17.1) */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">Duration Tokens</h2>
        
        <div className="space-y-2">
          <div className="p-4 bg-background-secondary rounded-lg transition-fast hover:bg-background-tertiary">
            Fast transition (150ms) - Hover me
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg transition-normal hover:bg-background-tertiary">
            Normal transition (300ms) - Hover me
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg transition-slow hover:bg-background-tertiary">
            Slow transition (500ms) - Hover me
          </div>
        </div>
      </section>
      
      {/* Easing Functions (Req 17.2) */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">Easing Functions</h2>
        
        <div className="space-y-2">
          <div className="p-4 bg-background-secondary rounded-lg transition-all duration-300 ease-out hover:translate-x-4">
            Ease-out (entrance) - Hover me
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg transition-all duration-300 ease-in hover:translate-x-4">
            Ease-in (exit) - Hover me
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg transition-all duration-300 ease-in-out hover:translate-x-4">
            Ease-in-out (movement) - Hover me
          </div>
        </div>
      </section>
      
      {/* Transition Utilities (Req 17.3) */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">Transition Utilities</h2>
        
        <div className="space-y-2">
          <div className="p-4 bg-background-secondary rounded-lg transition-entrance duration-300 hover:bg-primary-500 hover:text-white">
            Entrance transition - Hover me
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg transition-exit duration-300 hover:opacity-50">
            Exit transition - Hover me
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg transition-movement duration-300 hover:scale-105">
            Movement transition - Hover me
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg transition-colors duration-300 hover:bg-success-DEFAULT hover:text-white">
            Colors transition - Hover me
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg transition-transform-opacity duration-300 hover:scale-110 hover:opacity-80">
            Transform + Opacity transition - Hover me
          </div>
        </div>
      </section>
      
      {/* Reduced Motion Support (Req 17.4) */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">Reduced Motion Support</h2>
        
        <div className="space-y-2">
          <div className="p-4 bg-background-secondary rounded-lg motion-safe:animate-pulse">
            This pulses only when motion is safe (no prefers-reduced-motion)
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg motion-reduce:bg-warning-DEFAULT">
            This turns yellow when reduced motion is preferred
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:scale-105 motion-reduce:hover:bg-background-tertiary">
            Scales on hover (motion safe) or changes color (motion reduce)
          </div>
        </div>
        
        <p className="text-sm text-text-tertiary">
          To test reduced motion: Enable "Reduce motion" in your OS accessibility settings
        </p>
      </section>
      
      {/* Animation Examples */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">Animation Examples</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-background-secondary rounded-lg animate-fade-in">
            Fade in animation
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg animate-slide-in">
            Slide in animation
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg animate-scale-in">
            Scale in animation
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg animate-pulse-slow">
            Slow pulse animation
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg animate-spin-slow">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
          
          <div className="p-4 bg-background-secondary rounded-lg hover:animate-scale-bounce">
            Bounce on hover
          </div>
        </div>
      </section>
      
      {/* Combined Examples */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">Combined Examples</h2>
        
        <div className="space-y-2">
          <button className="px-6 py-3 bg-primary-500 text-white rounded-lg transition-fast hover:bg-primary-600 active:scale-95 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
            Button with fast transition
          </button>
          
          <button className="px-6 py-3 bg-success-DEFAULT text-white rounded-lg transition-normal hover:bg-success-dark active:scale-95 motion-reduce:transition-none">
            Button with normal transition (respects reduced motion)
          </button>
          
          <button className="px-6 py-3 bg-error-DEFAULT text-white rounded-lg transition-slow hover:bg-error-dark hover:shadow-lg active:scale-95">
            Button with slow transition and shadow
          </button>
        </div>
      </section>
    </div>
  );
}

export default AnimationTokensTest;
