import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [showSecondText, setShowSecondText] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [taxValue, setTaxValue] = useState(0)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [showTaxDisplay, setShowTaxDisplay] = useState(false)
  const [desiredBoardPrice, setDesiredBoardPrice] = useState('')
  const [consignmentPrice, setConsignmentPrice] = useState('')
  const [isCopied, setIsCopied] = useState(false)
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

  const handleDesiredBoardPriceChange = (e) => {
    const value = e.target.value
    // Remove commas first to validate
    const rawValue = removeCommas(value)
    // Allow only numbers and decimal point
    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
      // Store the raw value for calculations
      const formattedValue = rawValue ? formatNumberWithCommas(rawValue) : ''
      setDesiredBoardPrice(formattedValue)
    }
  }

  // Calculate consignment price whenever desired board price or tax value changes
  useEffect(() => {
    const rawDesiredPrice = removeCommas(desiredBoardPrice)
    if (rawDesiredPrice && !isNaN(rawDesiredPrice) && parseFloat(rawDesiredPrice) > 0) {
      const dbp = parseFloat(rawDesiredPrice)
      const taxDecimal = taxValue / 100
      const calculatedPrice = dbp / (1 + taxDecimal)
      // Round down to the nearest whole number
      const roundedPrice = Math.floor(calculatedPrice)
      // Format with commas
      setConsignmentPrice(formatNumberWithCommas(roundedPrice))
    } else {
      setConsignmentPrice('')
    }
  }, [desiredBoardPrice, taxValue])

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
      if (isPWAMode) {
        document.body.classList.add('pwa-mode')
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
          // Show feedback
          setIsCopied(true)
          console.log('Copied to clipboard:', rawPrice)
          
          // Reset feedback after 2 seconds
          setTimeout(() => {
            setIsCopied(false)
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
              <input
                id="consignment-price"
                type="text"
                value={consignmentPrice}
                className="price-input readonly"
                placeholder="0"
                readOnly
              />
              <span className="currency-symbol">S</span>
            </div>
            <button 
              className={`copy-button ${isCopied ? 'copied' : ''}`}
              onClick={copyToClipboard}
              disabled={!consignmentPrice}
            >
              {isCopied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
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
