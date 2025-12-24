import { useState } from 'react'
import './Onboarding.css'

const STEPS = [
  {
    icon: '👨‍👩‍👧‍👦',
    title: 'Welcome to FamBam!',
    description: 'The app that helps your family stay connected, no matter the distance.',
  },
  {
    icon: '🎯',
    title: 'Complete Challenges',
    description: 'Earn points by calling family members, sharing updates, and celebrating wins together.',
  },
  {
    icon: '📸',
    title: 'Share Moments',
    description: 'Post photos, videos, and voice notes to keep everyone in the loop.',
  },
  {
    icon: '🏆',
    title: 'Climb the Leaderboard',
    description: 'See who\'s the most connected family member each week!',
  },
]

export default function Onboarding({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1

  return (
    <div className="onboarding">
      <button className="skip-btn" onClick={handleSkip}>
        Skip
      </button>

      <div className="onboarding-content">
        <span className="onboarding-icon">{step.icon}</span>
        <h1>{step.title}</h1>
        <p>{step.description}</p>
      </div>

      <div className="onboarding-footer">
        <div className="step-dots">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentStep ? 'active' : ''}`}
            />
          ))}
        </div>

        <button className="btn-primary onboarding-btn" onClick={handleNext}>
          {isLastStep ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  )
}
