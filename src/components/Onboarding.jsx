import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './Onboarding.css'

const STEP_KEYS = ['welcome', 'challenges', 'share', 'leaderboard']
const STEP_ICONS = ['👨‍👩‍👧‍👦', '🎯', '📸', '🏆']

export default function Onboarding({ onComplete }) {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < STEP_KEYS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const stepKey = STEP_KEYS[currentStep]
  const isLastStep = currentStep === STEP_KEYS.length - 1

  return (
    <div className="onboarding">
      <button className="skip-btn" onClick={handleSkip}>
        {t('onboarding.skip')}
      </button>

      <div className="onboarding-content">
        <span className="onboarding-icon">{STEP_ICONS[currentStep]}</span>
        <h1>{t(`onboarding.steps.${stepKey}.title`)}</h1>
        <p>{t(`onboarding.steps.${stepKey}.description`)}</p>
      </div>

      <div className="onboarding-footer">
        <div className="step-dots">
          {STEP_KEYS.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentStep ? 'active' : ''}`}
            />
          ))}
        </div>

        <button className="btn-primary onboarding-btn" onClick={handleNext}>
          {isLastStep ? t('onboarding.getStarted') : t('onboarding.next')}
        </button>
      </div>
    </div>
  )
}
