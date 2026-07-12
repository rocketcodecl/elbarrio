function Stepper({ currentStep, totalSteps = 4 }) {
  return (
    <div style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isActive = stepNumber === currentStep
        const isLast = stepNumber === totalSteps

        return (
          <div key={index} style={styles.stepWrapper}>
            <div style={{
              ...styles.circle,
              background: isCompleted || isActive ? '#138864' : '#E5E7EB',
              color: isCompleted || isActive ? 'white' : '#9CA3AF',
            }}>
              {isCompleted ? '✓' : stepNumber}
            </div>
            {!isLast && (
              <div style={{
                ...styles.line,
                background: isCompleted ? '#138864' : '#E5E7EB',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    width: '100%',
  },
  stepWrapper: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 800,
    transition: 'all 0.3s ease',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
  },
  line: {
    flex: 1,
    height: 2,
    marginLeft: 4,
    marginRight: 4,
    transition: 'all 0.3s ease',
    borderRadius: 2,
  },
}

export default Stepper