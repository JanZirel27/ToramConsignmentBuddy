import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [showSecondText, setShowSecondText] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [taxValue, setTaxValue] = useState(0)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [showTaxDisplay, setShowTaxDisplay] = useState(false)
  const [desiredBoardPrice, setDesiredBoardPrice] = useState('')
  const [consignmentPrice, setConsignmentPrice] = useState('')
  const [earnings, setEarnings] = useState('')
  const [priceInputSource, setPriceInputSource] = useState('desired') // 'desired' | 'earnings'
  const [isCopied, setIsCopied] = useState(false)
  const [copyAlertKey, setCopyAlertKey] = useState(0)
  const copyResetTimeoutRef = useRef(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [isPWA, setIsPWA] = useState(false)

  // Format number with commas
  const formatNumberWithCommas = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // Remove commas from formatted number to get raw value
  const removeCommas = (value) => {
    return value.replace(/,/g, '')
  }

  const sanitizePriceInput = (value) => {
    let rawValue = removeCommas(value)

    // Expand trailing k/m: 2.1m → 2100000, 5k → 5000
    const suffixMatch = rawValue.match(/^(\d*\.?\d+)([kKmM])$/)
    if (suffixMatch) {
      const base = parseFloat(suffixMatch[1])
      const multiplier = suffixMatch[2].toLowerCase() === 'm' ? 1_000_000 : 1_000
      rawValue = String(Math.round(base * multiplier))
    }

    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
      return rawValue ? formatNumberWithCommas(rawValue) : ''
    }
    return null
  }

  const calculateConsignmentFromDbp = (dbp) => {
    const taxDecimal = taxValue / 100
    return Math.ceil(dbp / (1 + taxDecimal))
  }

  const calculateEarningsFromConsignment = (cp) => {
    return cp - Math.floor(cp / 10)
  }

  // Inverse of earnings = CP - floor(CP / 10). Prefer the largest matching CP.
  const calculateConsignmentFromEarnings = (earningsValue) => {
    const target = Math.floor(earningsValue)
    let best = null

    for (let r = 0; r <= 9; r++) {
      if ((target - r) % 9 === 0) {
        const q = (target - r) / 9
        if (q >= 0) {
          const cp = 10 * q + r
          if (best === null || cp > best) best = cp
        }
      }
    }

    return best ?? Math.floor(target * 10 / 9)
  }

  // Pick a DBP that forward-maps to the given consignment price when possible.
  const calculateDbpFromConsignment = (cp) => {
    const taxDecimal = taxValue / 100
    if (taxDecimal === 0) return cp

    const maxDbp = Math.floor(cp * (1 + taxDecimal))
    const minDbp = Math.floor((cp - 1) * (1 + taxDecimal)) + 1

    for (let dbp = maxDbp; dbp >= minDbp; dbp--) {
      if (calculateConsignmentFromDbp(dbp) === cp) return dbp
    }

    // If this CP can't be produced at the current tax, use the nearest forward-consistent pair.
    return maxDbp
  }

  const handleDesiredBoardPriceChange = (e) => {
    const formattedValue = sanitizePriceInput(e.target.value)
    if (formattedValue !== null) {
      setPriceInputSource('desired')
      setDesiredBoardPrice(formattedValue)
    }
  }

  const handleEarningsChange = (e) => {
    const formattedValue = sanitizePriceInput(e.target.value)
    if (formattedValue !== null) {
      setPriceInputSource('earnings')
      setEarnings(formattedValue)
    }
  }

  // Keep DBP, consignment, and earnings in sync based on which field was last edited
  useEffect(() => {
    if (priceInputSource === 'desired') {
      const rawDesiredPrice = removeCommas(desiredBoardPrice)
      if (rawDesiredPrice && !isNaN(rawDesiredPrice) && parseFloat(rawDesiredPrice) > 0) {
        const dbp = parseFloat(rawDesiredPrice)
        const roundedPrice = calculateConsignmentFromDbp(dbp)
        setConsignmentPrice(formatNumberWithCommas(roundedPrice))
        setEarnings(formatNumberWithCommas(calculateEarningsFromConsignment(roundedPrice)))
      } else {
        setConsignmentPrice('')
        setEarnings('')
      }
      return
    }

    const rawEarnings = removeCommas(earnings)
    if (rawEarnings && !isNaN(rawEarnings) && parseFloat(rawEarnings) > 0) {
      const earningsValue = parseFloat(rawEarnings)
      // Earnings -> undo 10% fee -> CP -> undo tax -> DBP
      const targetCp = calculateConsignmentFromEarnings(earningsValue)
      const dbp = calculateDbpFromConsignment(targetCp)
      const actualCp = calculateConsignmentFromDbp(dbp)
      setDesiredBoardPrice(formatNumberWithCommas(dbp))
      setConsignmentPrice(formatNumberWithCommas(actualCp))
      // Keep all three fields consistent if tax makes the exact CP unreachable
      const syncedEarnings = calculateEarningsFromConsignment(actualCp)
      if (syncedEarnings !== Math.floor(earningsValue)) {
        setEarnings(formatNumberWithCommas(syncedEarnings))
      }
    } else {
      setDesiredBoardPrice('')
      setConsignmentPrice('')
    }
  }, [desiredBoardPrice, earnings, taxValue, priceInputSource])

  // Detect PWA mode
  useEffect(() => {
    const detectPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = window.navigator.standalone === true
      const isMobile = window.matchMedia('(max-width: 768px)').matches
      const isPWAMode = (isStandalone || isIOSStandalone) && isMobile
      setIsPWA(isPWAMode)
      
      // Add class to body for CSS targeting - only for mobile PWA
      document.body.classList.remove('pwa-mode')
      const titleElement = document.querySelector('.main-title')
      if (titleElement) {
        titleElement.classList.remove('pwa-mode-title')
      }
      
      if (isPWAMode) {
        document.body.classList.add('pwa-mode')
        if (titleElement) {
          titleElement.classList.add('pwa-mode-title')
        }
      }
    }
    
    detectPWA()
    
    // Listen for changes in display mode and screen size
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const mobileQuery = window.matchMedia('(max-width: 768px)')
    
    mediaQuery.addListener(detectPWA)
    mobileQuery.addListener(detectPWA)
    
    return () => {
      mediaQuery.removeListener(detectPWA)
      mobileQuery.removeListener(detectPWA)
    }
  }, [])

  // PWA Install functionality
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      
      // Force show install button for all devices as requested
      setShowInstallButton(true)
    }

    const handleAppInstalled = () => {
      // Hide the install button when app is installed
      setShowInstallButton(false)
      setDeferredPrompt(null)
      console.log('PWA was installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  const copyToClipboard = () => {
    if (consignmentPrice) {
      // Remove commas before copying
      const rawPrice = removeCommas(consignmentPrice)
      navigator.clipboard.writeText(rawPrice)
        .then(() => {
          if (copyResetTimeoutRef.current) {
            clearTimeout(copyResetTimeoutRef.current)
          }

          // Remount alert so the fade animation restarts on repeat clicks
          setCopyAlertKey((key) => key + 1)
          setIsCopied(true)
          console.log('Copied to clipboard:', rawPrice)

          copyResetTimeoutRef.current = setTimeout(() => {
            setIsCopied(false)
            copyResetTimeoutRef.current = null
          }, 2000)
        })
        .catch(err => {
          console.error('Failed to copy:', err)
        })
    }
  }

  useEffect(() => {
    // Show second text after 2 seconds (when upward animation completes)
    const timer1 = setTimeout(() => {
      setShowSecondText(true)
    }, 2000)

    // Show input after 3 seconds (1 second after second text appears)
    const timer2 = setTimeout(() => {
      setShowInput(true)
    }, 3000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const handleTaxChange = (e) => {
    const value = parseInt(e.target.value)
    if (value >= 0 && value <= 6) {
      setTaxValue(value)
    }
  }

  const incrementTax = () => {
    if (taxValue < 6) {
      setTaxValue(taxValue + 1)
    }
  }

  const decrementTax = () => {
    if (taxValue > 0) {
      setTaxValue(taxValue - 1)
    }
  }

  const handleConfirm = () => {
    console.log('Tax value confirmed:', taxValue)
    setIsConfirmed(true)
    
    // Show tax display after title animation completes (0.8s)
    setTimeout(() => {
      setShowTaxDisplay(true)
    }, 800)
  }

  return (
    <div className="App">
      {/* PWA Install Button */}
      {showInstallButton && (
        <button 
          className="install-button"
          onClick={handleInstallClick}
          title="Install Consignment Buddy as an app"
        >
          📱 Install App
        </button>
      )}
      
      <h1 className={`main-title ${isConfirmed ? 'float-to-corner' : ''}`}>Consignment Buddy</h1>
      
      <div className={`price-calculator ${showTaxDisplay ? 'fade-in' : ''}`}>
        <div className="tax-display">
          Today's Tax is {taxValue}%
        </div>
        
        <div className="price-inputs">
          <div className="price-input-group">
            <label htmlFor="desired-board-price">Desired Board Price</label>
            <div className="price-input-wrapper">
              <input
                id="desired-board-price"
                type="text"
                inputMode="decimal"
                value={desiredBoardPrice}
                onChange={handleDesiredBoardPriceChange}
                className="price-input"
                placeholder="0"
              />
              <span className="currency-symbol">S</span>
            </div>
          </div>
          
          <div className="price-input-group">
            <label htmlFor="consignment-price">Consignment Price</label>
            <div className="price-input-wrapper">
              <button 
                type="button"
                className={`copy-button ${isCopied ? 'copied' : ''}`}
                onClick={copyToClipboard}
                disabled={!consignmentPrice}
                title={isCopied ? 'Copied!' : 'Copy to clipboard'}
                aria-label={isCopied ? 'Copied!' : 'Copy to clipboard'}
              >
                {isCopied ? (
                  <svg className="copy-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                ) : (
                  <svg className="copy-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                  </svg>
                )}
              </button>
              <input
                id="consignment-price"
                type="text"
                value={consignmentPrice}
                className="price-input readonly has-copy-button"
                placeholder="0"
                readOnly
              />
              <span className="currency-symbol">S</span>
              <span
                key={copyAlertKey}
                className={`copy-alert ${isCopied ? 'show' : ''}`}
                aria-live="polite"
              >
                Copied to clipboard!
              </span>
            </div>
          </div>

          <div className="price-input-group">
            <label htmlFor="earnings">Earnings</label>
            <div className="price-input-wrapper">
              <input
                id="earnings"
                type="text"
                inputMode="decimal"
                value={earnings}
                onChange={handleEarningsChange}
                className="price-input"
                placeholder="0"
              />
              <span className="currency-symbol">S</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className={`content-container ${isConfirmed ? 'fade-out' : ''}`}>
        <h2 className={`second-title ${showSecondText ? 'fade-in' : ''}`}>
          How much is Today's Tax?
        </h2>
        <div className={`input-container ${showInput ? 'fade-in' : ''}`}>
          <div className="input-group">
            <button 
              className="stepper-button decrement" 
              onClick={decrementTax}
              disabled={taxValue <= 0}
            >
              −
            </button>
            <div className="input-wrapper">
              <input
                type="number"
                min="0"
                max="6"
                value={taxValue}
                onChange={handleTaxChange}
                className="tax-input"
                placeholder="0"
              />
              <span className="percentage-symbol">%</span>
            </div>
            <button 
              className="stepper-button increment" 
              onClick={incrementTax}
              disabled={taxValue >= 6}
            >
              +
            </button>
          </div>
          <button 
            className="confirm-button" 
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
