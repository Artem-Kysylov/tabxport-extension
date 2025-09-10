var e,t;"function"==typeof(e=globalThis.define)&&(t=e,e=null),function(t,i,r,n,o){var a="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},l="function"==typeof a[n]&&a[n],s=l.cache||{},p="undefined"!=typeof module&&"function"==typeof module.require&&module.require.bind(module);function d(e,i){if(!s[e]){if(!t[e]){var r="function"==typeof a[n]&&a[n];if(!i&&r)return r(e,!0);if(l)return l(e,!0);if(p&&"string"==typeof e)return p(e);var o=Error("Cannot find module '"+e+"'");throw o.code="MODULE_NOT_FOUND",o}g.resolve=function(i){var r=t[e][1][i];return null!=r?r:i},g.cache={};var m=s[e]=new d.Module(e);t[e][0].call(m.exports,g,m,m.exports,this)}return s[e].exports;function g(e){var t=g.resolve(e);return!1===t?{}:d(t)}}d.isParcelRequire=!0,d.Module=function(e){this.id=e,this.bundle=d,this.exports={}},d.modules=t,d.cache=s,d.parent=l,d.register=function(e,i){t[e]=[function(e,t){t.exports=i},{}]},Object.defineProperty(d,"root",{get:function(){return a[n]}}),a[n]=d;for(var m=0;m<i.length;m++)d(i[m]);if(r){var g=d(r);"object"==typeof exports&&"undefined"!=typeof module?module.exports=g:"function"==typeof e&&e.amd?e(function(){return g}):o&&(this[o]=g)}}({Z83OH:[function(e,t,i){var r=e("@parcel/transformer-js/src/esmodule-helpers.js");r.defineInteropFlag(i),r.export(i,"showLimitWarning",()=>p),r.export(i,"checkAndShowLimitWarning",()=>m),r.export(i,"hideLimitWarning",()=>d),r.export(i,"showLimitExceededWarning",()=>g),e("../../lib/supabase/auth-service"),e("../../lib/supabase");let n=null,o=0,a=()=>`
    .tablexport-limit-warning {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 999999;
      background: linear-gradient(135deg, #ff6b6b, #ee5a52);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 350px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      animation: slideInUp 0.4s ease-out;
    }

    .tablexport-limit-warning-yellow {
      background: linear-gradient(135deg, #ffd93d, #f39c12);
      box-shadow: 0 8px 32px rgba(255, 217, 61, 0.3);
    }

    .tablexport-limit-warning-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }

    .tablexport-limit-warning-icon {
      width: 20px;
      height: 20px;
      margin-right: 8px;
      flex-shrink: 0;
    }

    .tablexport-limit-warning-title {
      font-weight: 600;
      font-size: 15px;
    }

    .tablexport-limit-warning-message {
      margin-bottom: 12px;
      line-height: 1.4;
      opacity: 0.95;
    }

    .tablexport-limit-warning-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .tablexport-limit-warning-button {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tablexport-limit-warning-button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    .tablexport-limit-warning-button-primary {
      background: rgba(255, 255, 255, 0.9);
      color: #333;
    }

    .tablexport-limit-warning-button-primary:hover {
      background: white;
    }

    .tablexport-limit-warning-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 18px;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .tablexport-limit-warning-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    @keyframes slideInUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes slideOutDown {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(100%);
        opacity: 0;
      }
    }

    .tablexport-limit-warning.hiding {
      animation: slideOutDown 0.3s ease-in forwards;
    }
  `,l=()=>{if(document.getElementById("tablexport-limit-warning-styles"))return;let e=document.createElement("style");e.id="tablexport-limit-warning-styles",e.textContent=a(),document.head.appendChild(e)},s=e=>{let t=e.exports_remaining<=2&&e.exports_remaining>0,i=0===e.exports_remaining,r="";i?r=`You've used all ${e.daily_limit} daily exports. Upgrade to Pro for unlimited exports or wait for reset.`:t&&(r=`Only ${e.exports_remaining} export${1===e.exports_remaining?"":"s"} left today. Consider upgrading to Pro for unlimited access.`);let n=new Date(e.reset_time),o=new Date,a=n.getTime()-o.getTime(),l=Math.floor(a/36e5),s=Math.floor(a%36e5/6e4),p=l>0?`${l}h ${s}m`:`${s}m`;return`
    <div class="${i?"tablexport-limit-warning":t?"tablexport-limit-warning tablexport-limit-warning-yellow":"tablexport-limit-warning"}">
      <button class="tablexport-limit-warning-close">\xd7</button>
      
      <div class="tablexport-limit-warning-header">
        <span class="tablexport-limit-warning-icon">${i?"\u26a0\ufe0f":"\uD83D\uDCCA"}</span>
        <span class="tablexport-limit-warning-title">${i?"Export Limit Reached":"Export Limit Warning"}</span>
      </div>
      
      <div class="tablexport-limit-warning-message">
        ${r}
        ${"free"===e.plan_type?`<br><small>Resets in ${p}</small>`:""}
      </div>
      
      <div class="tablexport-limit-warning-actions">
        ${"free"===e.plan_type?'<a class="tablexport-limit-warning-button tablexport-limit-warning-button-primary" href="https://www.tablexport.com/payment?source=extension" target="_blank" rel="noopener noreferrer">Upgrade to Pro</a>':""}
        <button class="tablexport-limit-warning-button tablexport-limit-warning-dismiss">Dismiss</button>
      </div>
    </div>
  `},p=(e,t={})=>{let{force:i=!1}=t,r=Date.now();if(!i&&r-o<3e4){console.log(`TabXport: Warning cooldown active. Skipping. Last shown ${((r-o)/1e3).toFixed(1)}s ago.`);return}n&&(n.remove(),n=null),l(),(n=document.createElement("div")).innerHTML=s(e),document.body.appendChild(n.firstElementChild),n=document.querySelector(".tablexport-limit-warning"),o=Date.now();let a=n.querySelector(".tablexport-limit-warning-close"),p=n.querySelector(".tablexport-limit-warning-dismiss"),d=()=>{n&&(n.classList.add("hiding"),setTimeout(()=>{n?.remove(),n=null},300))};a?.addEventListener("click",d),p?.addEventListener("click",d)},d=()=>{n&&(n.remove(),n=null)},m=async()=>{},g=async e=>{}},{"../../lib/supabase/auth-service":"eQfzB","../../lib/supabase":"gnzcN","@parcel/transformer-js/src/esmodule-helpers.js":"fRZO2"}]},[],null,"parcelRequire709e"),globalThis.define=t;