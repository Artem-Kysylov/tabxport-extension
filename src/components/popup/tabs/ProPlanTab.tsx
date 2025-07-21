import React, { useState, useEffect } from "react"
import { SubscriptionService } from "../../../lib/supabase/subscription-service"
import { supabase } from "../../../lib/supabase"

interface ProPlanTabProps {
  onUpgradeClick: () => void
}

interface UserPlan {
  planType: 'free' | 'pro' | 'enterprise'
  isLoading: boolean
  isAuthenticated: boolean
}

interface ComparisonFeature {
  name: string
  free: boolean
  pro: boolean
}

const comparisonFeatures: ComparisonFeature[] = [
  { name: 'Export to Excel / CSV', free: true, pro: true },
  { name: 'Export to Google Drive', free: false, pro: true },
  { name: 'Export to Google Sheets', free: false, pro: true },
  { name: 'Batch export up to 10 tables', free: false, pro: true },
  { name: 'Formula support (Sum, etc)', free: false, pro: true },
  { name: '"Remember format" toggle', free: true, pro: true },
  { name: 'Priority support', free: false, pro: true },
]

export const ProPlanTab: React.FC<ProPlanTabProps> = ({ onUpgradeClick }) => {
  const [userPlan, setUserPlan] = useState<UserPlan>({
    planType: 'free',
    isLoading: true,
    isAuthenticated: false
  })

  const checkUserPlan = async () => {
    try {
      setUserPlan(prev => ({ ...prev, isLoading: true }))
      
      // Получаем данные через background скрипт вместо прямого обращения к Supabase
      const response = await chrome.runtime.sendMessage({
        type: "CHECK_SUBSCRIPTION"
      })
      
      if (response.success) {
        setUserPlan({
          planType: response.subscription.planType,
          isLoading: false,
          isAuthenticated: response.subscription.isAuthenticated
        })
      } else {
        // Если ответ неуспешный, устанавливаем бесплатный план
        setUserPlan({ planType: 'free', isLoading: false, isAuthenticated: false })
      }
    } catch (error) {
      console.error("Failed to check subscription:", error)
      setUserPlan({ planType: 'free', isLoading: false, isAuthenticated: false })
    }
  }

  // Первоначальная проверка при монтировании компонента
  useEffect(() => {
    checkUserPlan()
  }, [])
  
  // Добавляем периодическую проверку статуса подписки
  useEffect(() => {
    // Периодически проверяем статус подписки
    const interval: ReturnType<typeof setInterval> = setInterval(checkUserPlan, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const handleUpgradeClick = () => {
    onUpgradeClick()
    chrome.tabs.create({ url: 'https://tabxport.com/pricing' })
  }

  const renderCurrentPlan = () => {
    // Для неаутентифицированных пользователей показываем Free план
    const isPro = userPlan.isAuthenticated && userPlan.planType === 'pro'
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <div 
          style={{
            padding: '16px',
            backgroundColor: isPro ? '#f0f9ff' : '#f8fdf9',
            border: `1px solid ${isPro ? '#bfdbfe' : '#d1e7dd'}`,
            borderRadius: '10px'
          }}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}
          >
            <span 
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#062013'
              }}
            >
              Your current plan: {isPro ? 'Pro' : 'Free'}
            </span>
          </div>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isPro ? (
              <div 
                style={{ width: '16px', height: '16px' }}
                dangerouslySetInnerHTML={{
                  __html: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 1.25C12.3206 1.25 14.5462 2.17187 16.1872 3.81282C17.8281 5.45376 18.75 7.67936 18.75 10C18.75 12.3206 17.8281 14.5462 16.1872 16.1872C14.5462 17.8281 12.3206 18.75 10 18.75C7.67936 18.75 5.45376 17.8281 3.81282 16.1872C2.17187 14.5462 1.25 12.3206 1.25 10C1.25 7.67936 2.17187 5.45376 3.81282 3.81282C5.45376 2.17187 7.67936 1.25 10 1.25ZM8.91 11.7262L6.96625 9.78125C6.89657 9.71157 6.81384 9.65629 6.7228 9.61858C6.63175 9.58087 6.53417 9.56146 6.43562 9.56146C6.33708 9.56146 6.2395 9.58087 6.14845 9.61858C6.05741 9.65629 5.97468 9.71157 5.905 9.78125C5.76427 9.92198 5.68521 10.1129 5.68521 10.3119C5.68521 10.5109 5.76427 10.7018 5.905 10.8425L8.38 13.3175C8.44948 13.3875 8.53214 13.4431 8.62322 13.4811C8.71429 13.519 8.81197 13.5385 8.91062 13.5385C9.00928 13.5385 9.10696 13.519 9.19803 13.4811C9.28911 13.4431 9.37177 13.3875 9.44125 13.3175L14.5662 8.19125C14.6369 8.12186 14.693 8.03917 14.7315 7.94796C14.77 7.85674 14.7901 7.75881 14.7906 7.65981C14.791 7.5608 14.7719 7.46269 14.7342 7.37112C14.6966 7.27956 14.6412 7.19635 14.5712 7.1263C14.5012 7.05626 14.4181 7.00075 14.3266 6.963C14.2351 6.92524 14.137 6.90598 14.038 6.90632C13.939 6.90667 13.841 6.92661 13.7497 6.965C13.6585 7.00339 13.5757 7.05947 13.5063 7.13L8.91 11.7262Z" fill="#1B9358"/></svg>'
                }}
              />
            ) : (
              <div 
                style={{ width: '16px', height: '16px' }}
                dangerouslySetInnerHTML={{
                  __html: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.8274 5.70359V4.17263C11.8274 2.02928 10.1433 0.345215 7.99996 0.345215C5.85661 0.345215 4.17255 2.02928 4.17255 4.17263V5.70359C2.87123 5.70359 1.8761 6.69872 1.8761 8.00004V13.3584C1.8761 14.6597 2.87123 15.6549 4.17255 15.6549H11.8274C13.1287 15.6549 14.1238 14.6597 14.1238 13.3584V8.00004C14.1238 6.69872 13.1287 5.70359 11.8274 5.70359ZM5.70351 4.17263C5.70351 2.87131 6.69864 1.87618 7.99996 1.87618C9.30128 1.87618 10.2964 2.87131 10.2964 4.17263V5.70359H5.70351V4.17263ZM8.84199 10.6792L8.76544 10.7558V11.8275C8.76544 12.2867 8.45925 12.5929 7.99996 12.5929C7.54067 12.5929 7.23448 12.2867 7.23448 11.8275V10.7558C6.77519 10.2965 6.69864 9.60755 7.15793 9.14826C7.61722 8.68897 8.30615 8.61243 8.76544 9.07172C9.22473 9.45446 9.30128 10.2199 8.84199 10.6792Z" fill="#062013"/></svg>'
                }}
              />
            )}
            <span 
              style={{
                fontSize: '12px',
                color: '#062013'
              }}
            >
              {isPro ? 'Full access unlocked. Thank you!' : 'Limited access to premium features'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderComparisonTable = () => {
    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#062013',
            margin: '0 0 16px 0'
          }}
        >
          Free vs Pro Comparison
        </h3>
        
        <div 
          style={{
            border: '1px solid #CDD2D0',
            borderRadius: '10px',
            overflow: 'hidden'
          }}
        >
          {/* Table Header */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 60px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #CDD2D0'
            }}
          >
            <div 
              style={{
                padding: '12px 16px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#062013',
                borderRight: '1px solid #CDD2D0'
              }}
            >
              Feature
            </div>
            <div 
              style={{
                padding: '12px 8px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#062013',
                textAlign: 'center',
                borderRight: '1px solid #CDD2D0'
              }}
            >
              Free
            </div>
            <div 
              style={{
                padding: '12px 8px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#062013',
                textAlign: 'center'
              }}
            >
              Pro
            </div>
          </div>

          {/* Table Rows */}
          {comparisonFeatures.map((feature, index) => (
            <div 
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 60px 60px',
                borderBottom: index < comparisonFeatures.length - 1 ? '1px solid #e5e7eb' : 'none'
              }}
            >
              <div 
                style={{
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: '#062013',
                  borderRight: '1px solid #e5e7eb'
                }}
              >
                {feature.name}
              </div>
                             <div 
                 style={{
                   padding: '12px 8px',
                   textAlign: 'center',
                   borderRight: '1px solid #e5e7eb',
                   display: 'flex',
                   justifyContent: 'center',
                   alignItems: 'center'
                 }}
               >
                 {feature.free ? (
                   <div 
                     style={{ width: '14px', height: '14px' }}
                     dangerouslySetInnerHTML={{
                       __html: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 1.25C12.3206 1.25 14.5462 2.17187 16.1872 3.81282C17.8281 5.45376 18.75 7.67936 18.75 10C18.75 12.3206 17.8281 14.5462 16.1872 16.1872C14.5462 17.8281 12.3206 18.75 10 18.75C7.67936 18.75 5.45376 17.8281 3.81282 16.1872C2.17187 14.5462 1.25 12.3206 1.25 10C1.25 7.67936 2.17187 5.45376 3.81282 3.81282C5.45376 2.17187 7.67936 1.25 10 1.25ZM8.91 11.7262L6.96625 9.78125C6.89657 9.71157 6.81384 9.65629 6.7228 9.61858C6.63175 9.58087 6.53417 9.56146 6.43562 9.56146C6.33708 9.56146 6.2395 9.58087 6.14845 9.61858C6.05741 9.65629 5.97468 9.71157 5.905 9.78125C5.76427 9.92198 5.68521 10.1129 5.68521 10.3119C5.68521 10.5109 5.76427 10.7018 5.905 10.8425L8.38 13.3175C8.44948 13.3875 8.53214 13.4431 8.62322 13.4811C8.71429 13.519 8.81197 13.5385 8.91062 13.5385C9.00928 13.5385 9.10696 13.519 9.19803 13.4811C9.28911 13.4431 9.37177 13.3875 9.44125 13.3175L14.5662 8.19125C14.6369 8.12186 14.693 8.03917 14.7315 7.94796C14.77 7.85674 14.7901 7.75881 14.7906 7.65981C14.791 7.5608 14.7719 7.46269 14.7342 7.37112C14.6966 7.27956 14.6412 7.19635 14.5712 7.1263C14.5012 7.05626 14.4181 7.00075 14.3266 6.963C14.2351 6.92524 14.137 6.90598 14.038 6.90632C13.939 6.90667 13.841 6.92661 13.7497 6.965C13.6585 7.00339 13.5757 7.05947 13.5063 7.13L8.91 11.7262Z" fill="#1B9358"/></svg>'
                     }}
                   />
                 ) : (
                   <div 
                     style={{ width: '14px', height: '14px' }}
                     dangerouslySetInnerHTML={{
                       __html: '<svg width="14" height="14" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 11.8149L12.4167 14.2316C12.5695 14.3844 12.7639 14.4608 13 14.4608C13.2361 14.4608 13.4306 14.3844 13.5834 14.2316C13.7361 14.0788 13.8125 13.8844 13.8125 13.6483C13.8125 13.4122 13.7361 13.2177 13.5834 13.0649L11.1667 10.6483L13.5834 8.23161C13.7361 8.07883 13.8125 7.88439 13.8125 7.64827C13.8125 7.41216 13.7361 7.21772 13.5834 7.06494C13.4306 6.91216 13.2361 6.83578 13 6.83578C12.7639 6.83578 12.5695 6.91216 12.4167 7.06494L10 9.48161L7.58336 7.06494C7.43058 6.91216 7.23613 6.83578 7.00002 6.83578C6.76391 6.83578 6.56947 6.91216 6.41669 7.06494C6.26391 7.21772 6.18752 7.41216 6.18752 7.64827C6.18752 7.88439 6.26391 8.07883 6.41669 8.23161L8.83335 10.6483L6.41669 13.0649C6.26391 13.2177 6.18752 13.4122 6.18752 13.6483C6.18752 13.8844 6.26391 14.0788 6.41669 14.2316C6.56947 14.3844 6.76391 14.4608 7.00002 14.4608C7.23613 14.4608 7.43058 14.3844 7.58336 14.2316L10 11.8149ZM10 18.9816C8.84724 18.9816 7.76391 18.7627 6.75002 18.3249C5.73613 17.8872 4.85419 17.2936 4.10419 16.5441C3.35419 15.7947 2.76058 14.9127 2.32335 13.8983C1.88613 12.8838 1.66724 11.8005 1.66669 10.6483C1.66613 9.49605 1.88502 8.41272 2.32335 7.39828C2.76169 6.38383 3.3553 5.50189 4.10419 4.75244C4.85308 4.003 5.73502 3.40939 6.75002 2.97161C7.76502 2.53383 8.84835 2.31494 10 2.31494C11.1517 2.31494 12.235 2.53383 13.25 2.97161C14.265 3.40939 15.147 4.003 15.8959 4.75244C16.6447 5.50189 17.2386 6.38383 17.6775 7.39828C18.1164 8.41272 18.335 9.49605 18.3334 10.6483C18.3317 11.8005 18.1128 12.8838 17.6767 13.8983C17.2406 14.9127 16.647 15.7947 15.8959 16.5441C15.1447 17.2936 14.2628 17.8874 13.25 18.3258C12.2372 18.7641 11.1539 18.9827 10 18.9816Z" fill="#6b7280"/></svg>'
                     }}
                   />
                 )}
               </div>
               <div 
                 style={{
                   padding: '12px 8px',
                   textAlign: 'center',
                   display: 'flex',
                   justifyContent: 'center',
                   alignItems: 'center'
                 }}
               >
                 {feature.pro ? (
                   <div 
                     style={{ width: '14px', height: '14px' }}
                     dangerouslySetInnerHTML={{
                       __html: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 1.25C12.3206 1.25 14.5462 2.17187 16.1872 3.81282C17.8281 5.45376 18.75 7.67936 18.75 10C18.75 12.3206 17.8281 14.5462 16.1872 16.1872C14.5462 17.8281 12.3206 18.75 10 18.75C7.67936 18.75 5.45376 17.8281 3.81282 16.1872C2.17187 14.5462 1.25 12.3206 1.25 10C1.25 7.67936 2.17187 5.45376 3.81282 3.81282C5.45376 2.17187 7.67936 1.25 10 1.25ZM8.91 11.7262L6.96625 9.78125C6.89657 9.71157 6.81384 9.65629 6.7228 9.61858C6.63175 9.58087 6.53417 9.56146 6.43562 9.56146C6.33708 9.56146 6.2395 9.58087 6.14845 9.61858C6.05741 9.65629 5.97468 9.71157 5.905 9.78125C5.76427 9.92198 5.68521 10.1129 5.68521 10.3119C5.68521 10.5109 5.76427 10.7018 5.905 10.8425L8.38 13.3175C8.44948 13.3875 8.53214 13.4431 8.62322 13.4811C8.71429 13.519 8.81197 13.5385 8.91062 13.5385C9.00928 13.5385 9.10696 13.519 9.19803 13.4811C9.28911 13.4431 9.37177 13.3875 9.44125 13.3175L14.5662 8.19125C14.6369 8.12186 14.693 8.03917 14.7315 7.94796C14.77 7.85674 14.7901 7.75881 14.7906 7.65981C14.791 7.5608 14.7719 7.46269 14.7342 7.37112C14.6966 7.27956 14.6412 7.19635 14.5712 7.1263C14.5012 7.05626 14.4181 7.00075 14.3266 6.963C14.2351 6.92524 14.137 6.90598 14.038 6.90632C13.939 6.90667 13.841 6.92661 13.7497 6.965C13.6585 7.00339 13.5757 7.05947 13.5063 7.13L8.91 11.7262Z" fill="#1B9358"/></svg>'
                     }}
                   />
                 ) : (
                   <div 
                     style={{ width: '14px', height: '14px' }}
                     dangerouslySetInnerHTML={{
                       __html: '<svg width="14" height="14" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 11.8149L12.4167 14.2316C12.5695 14.3844 12.7639 14.4608 13 14.4608C13.2361 14.4608 13.4306 14.3844 13.5834 14.2316C13.7361 14.0788 13.8125 13.8844 13.8125 13.6483C13.8125 13.4122 13.7361 13.2177 13.5834 13.0649L11.1667 10.6483L13.5834 8.23161C13.7361 8.07883 13.8125 7.88439 13.8125 7.64827C13.8125 7.41216 13.7361 7.21772 13.5834 7.06494C13.4306 6.91216 13.2361 6.83578 13 6.83578C12.7639 6.83578 12.5695 6.91216 12.4167 7.06494L10 9.48161L7.58336 7.06494C7.43058 6.91216 7.23613 6.83578 7.00002 6.83578C6.76391 6.83578 6.56947 6.91216 6.41669 7.06494C6.26391 7.21772 6.18752 7.41216 6.18752 7.64827C6.18752 7.88439 6.26391 8.07883 6.41669 8.23161L8.83335 10.6483L6.41669 13.0649C6.26391 13.2177 6.18752 13.4122 6.18752 13.6483C6.18752 13.8844 6.26391 14.0788 6.41669 14.2316C6.56947 14.3844 6.76391 14.4608 7.00002 14.4608C7.23613 14.4608 7.43058 14.3844 7.58336 14.2316L10 11.8149ZM10 18.9816C8.84724 18.9816 7.76391 18.7627 6.75002 18.3249C5.73613 17.8872 4.85419 17.2936 4.10419 16.5441C3.35419 15.7947 2.76058 14.9127 2.32335 13.8983C1.88613 12.8838 1.66724 11.8005 1.66669 10.6483C1.66613 9.49605 1.88502 8.41272 2.32335 7.39828C2.76169 6.38383 3.3553 5.50189 4.10419 4.75244C4.85308 4.003 5.73502 3.40939 6.75002 2.97161C7.76502 2.53383 8.84835 2.31494 10 2.31494C11.1517 2.31494 12.235 2.53383 13.25 2.97161C14.265 3.40939 15.147 4.003 15.8959 4.75244C16.6447 5.50189 17.2386 6.38383 17.6775 7.39828C18.1164 8.41272 18.335 9.49605 18.3334 10.6483C18.3317 11.8005 18.1128 12.8838 17.6767 13.8983C17.2406 14.9127 16.647 15.7947 15.8959 16.5441C15.1447 17.2936 14.2628 17.8874 13.25 18.3258C12.2372 18.7641 11.1539 18.9827 10 18.9816Z" fill="#6b7280"/></svg>'
                     }}
                   />
                 )}
               </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderUpgradeCTA = () => {
    const isPro = userPlan.planType === 'pro'
    
    if (isPro) {
      return (
        <div style={{ marginBottom: '24px' }}>
          <div 
            style={{
              padding: '20px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
            <div 
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#062013',
                marginBottom: '4px'
              }}
            >
              You're all set!
            </div>
            <div 
              style={{
                fontSize: '12px',
                color: '#062013'
              }}
            >
              Enjoying the full power of TableXport Pro
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={{ marginBottom: '24px' }}>
                 <button
           onClick={handleUpgradeClick}
           style={{
             width: '100%',
             backgroundColor: '#1B9358',
             border: 'none',
             borderRadius: '10px',
             padding: '16px',
             fontSize: '14px',
             fontWeight: '600',
             color: '#ffffff',
             cursor: 'pointer',
             transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             gap: '8px',
             marginBottom: '16px'
           }}
           onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
           onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
         >
           <div 
             style={{ width: '16px', height: '16px' }}
             dangerouslySetInnerHTML={{
               __html: '<svg width="16" height="16" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4148 7.99805C15.1254 7.99821 14.845 8.09872 14.6213 8.28245C14.3977 8.46619 14.2447 8.72179 14.1883 9.00569C14.132 9.2896 14.1759 9.58425 14.3124 9.83944C14.449 10.0946 14.6698 10.2946 14.9373 10.4052C15.2048 10.5159 15.5023 10.5303 15.7792 10.4462C16.0562 10.3621 16.2954 10.1845 16.4561 9.94377C16.6168 9.70304 16.689 9.41404 16.6605 9.12601C16.6321 8.83797 16.5046 8.56873 16.2998 8.36414C16.1837 8.2478 16.0458 8.15557 15.8939 8.09274C15.742 8.02991 15.5792 7.99773 15.4148 7.99805Z" fill="white"/><path d="M22.38 2.99489C22.3798 2.9935 22.3798 2.99207 22.38 2.99068C22.3404 2.81692 22.253 2.65769 22.1276 2.53097C22.0023 2.40425 21.8441 2.31506 21.6708 2.27349C20.2739 1.93271 18.0764 2.29599 15.6413 3.27099C13.1869 4.25536 10.8872 5.70849 9.33282 7.26567C8.83464 7.76128 8.37179 8.29117 7.94767 8.85146C6.90095 8.80458 5.97892 8.95364 5.2022 9.29255C2.49563 10.4836 1.72267 13.5319 1.51688 14.7835C1.48711 14.9613 1.49877 15.1436 1.55096 15.3162C1.60314 15.4888 1.69445 15.647 1.81778 15.7786C1.9411 15.9101 2.09312 16.0114 2.26199 16.0746C2.43086 16.1378 2.61204 16.1611 2.79142 16.1429H2.79751L5.81251 15.8138C5.81626 15.8522 5.82048 15.8874 5.82376 15.9197C5.86248 16.2871 6.02633 16.63 6.28782 16.891L7.75923 18.3633C8.01979 18.6252 8.36263 18.7892 8.73001 18.8279L8.83079 18.8386L8.50267 21.8499V21.856C8.4859 22.0182 8.50315 22.1821 8.55333 22.3372C8.60351 22.4923 8.68551 22.6353 8.79408 22.7569C8.90266 22.8785 9.03542 22.9762 9.18388 23.0436C9.33234 23.111 9.49323 23.1467 9.65626 23.1483C9.72143 23.1484 9.7865 23.1431 9.85079 23.1324C11.1094 22.9299 14.1563 22.1663 15.3441 19.4452C15.6802 18.6736 15.8288 17.7554 15.787 16.7105C16.3499 16.2873 16.8817 15.8244 17.3784 15.3254C18.9455 13.7663 20.4033 11.4854 21.3774 9.06661C22.3472 6.65911 22.7124 4.44521 22.38 2.99489ZM17.3616 11.1924C16.9764 11.578 16.4856 11.8406 15.9511 11.9471C15.4166 12.0537 14.8626 11.9993 14.359 11.7909C13.8555 11.5824 13.4251 11.2293 13.1222 10.7762C12.8194 10.3232 12.6577 9.79042 12.6577 9.24544C12.6577 8.70046 12.8194 8.16773 13.1222 7.71463C13.4251 7.26154 13.8555 6.90845 14.359 6.70002C14.8626 6.4916 15.4166 6.43721 15.9511 6.54374C16.4856 6.65027 16.9764 6.91293 17.3616 7.29849C17.6197 7.55277 17.8247 7.85585 17.9647 8.1901C18.1046 8.52434 18.1767 8.88308 18.1767 9.24544C18.1767 9.6078 18.1046 9.96654 17.9647 10.3008C17.8247 10.635 17.6197 10.9381 17.3616 11.1924Z" fill="white"/><path d="M7.59047 18.7627C7.40909 18.7402 7.22573 18.7847 7.07485 18.8879C6.77531 19.0927 6.47438 19.2952 6.17063 19.4926C5.5561 19.892 4.8211 19.1907 5.18625 18.5551L5.75578 17.5707C5.83721 17.4516 5.88255 17.3115 5.88636 17.1673C5.89018 17.0231 5.85231 16.8808 5.77731 16.7575C5.7023 16.6343 5.59333 16.5353 5.46347 16.4724C5.3336 16.4095 5.18836 16.3855 5.04516 16.4031C4.41305 16.483 3.82549 16.7709 3.375 17.2215C3.20344 17.3935 2.68172 17.9157 2.40094 19.9056C2.32102 20.4771 2.27064 21.0524 2.25 21.6292C2.24744 21.7293 2.26494 21.8288 2.30148 21.9221C2.33802 22.0153 2.39286 22.1003 2.46276 22.172C2.53266 22.2436 2.61621 22.3006 2.70848 22.3395C2.80075 22.3784 2.89987 22.3984 3 22.3984H3.01875C3.59594 22.3779 4.1717 22.3279 4.74375 22.2484C6.73453 21.9671 7.25672 21.4449 7.42828 21.2734C7.88092 20.8227 8.16815 20.2324 8.24344 19.5981C8.26754 19.4007 8.2123 19.2019 8.08986 19.0452C7.96742 18.8886 7.7878 18.787 7.59047 18.7627Z" fill="white"/></svg>'
             }}
           />
           <span>Upgrade to Pro</span>
         </button>

        {/* Why upgrade section */}
        <div 
          style={{
            padding: '16px',
            backgroundColor: '#f8fdf9',
            border: '1px solid #d1e7dd',
            borderRadius: '10px'
          }}
        >
          <h4 
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#062013',
              margin: '0 0 12px 0'
            }}
          >
            Why upgrade?
          </h4>
          <div style={{ fontSize: '11px', color: '#062013', lineHeight: '1.5' }}>
            <div style={{ marginBottom: '4px' }}>• Export multiple tables at once</div>
            <div style={{ marginBottom: '4px' }}>• Enable Google Drive and Sheets integration</div>
            <div style={{ marginBottom: '4px' }}>• Unlock formulas for summaries</div>
            <div>• Get faster priority support</div>
          </div>
        </div>
      </div>
    )
  }

  const renderSupport = () => {
    return (
      <div 
        style={{
          textAlign: 'center',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}
      >
                 <div 
           style={{
             fontSize: '12px',
             color: '#6b7280'
           }}
         >
          Questions about billing?{' '}
          <span 
            style={{
              color: '#1B9358',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => chrome.tabs.create({ url: 'mailto:support@yourdomain.com' })}
          >
            Contact support@yourdomain.com
          </span>
        </div>
      </div>
    )
  }

  if (userPlan.isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        <h2 
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#062013',
            margin: '0 0 24px 0'
          }}
        >
          Pro Plan
        </h2>
        <div 
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#6b7280'
          }}
        >
          <div style={{ fontSize: '14px' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 
        style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#062013',
          margin: '0 0 24px 0'
        }}
      >
        Pro Plan
      </h2>
      
      {renderCurrentPlan()}
      {renderUpgradeCTA()}
      {renderComparisonTable()}
      {renderSupport()}
    </div>
  )
}