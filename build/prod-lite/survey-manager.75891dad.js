var e,t;"function"==typeof(e=globalThis.define)&&(t=e,e=null),function(t,r,o,n,s){var a="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},i="function"==typeof a[n]&&a[n],l=i.cache||{},u="undefined"!=typeof module&&"function"==typeof module.require&&module.require.bind(module);function d(e,r){if(!l[e]){if(!t[e]){var o="function"==typeof a[n]&&a[n];if(!r&&o)return o(e,!0);if(i)return i(e,!0);if(u&&"string"==typeof e)return u(e);var s=Error("Cannot find module '"+e+"'");throw s.code="MODULE_NOT_FOUND",s}p.resolve=function(r){var o=t[e][1][r];return null!=o?o:r},p.cache={};var c=l[e]=new d.Module(e);t[e][0].call(c.exports,p,c,c.exports,this)}return l[e].exports;function p(e){var t=p.resolve(e);return!1===t?{}:d(t)}}d.isParcelRequire=!0,d.Module=function(e){this.id=e,this.bundle=d,this.exports={}},d.modules=t,d.cache=l,d.parent=i,d.register=function(e,r){t[e]=[function(e,t){t.exports=r},{}]},Object.defineProperty(d,"root",{get:function(){return a[n]}}),a[n]=d;for(var c=0;c<r.length;c++)d(r[c]);if(o){var p=d(o);"object"==typeof exports&&"undefined"!=typeof module?module.exports=p:"function"==typeof e&&e.amd?e(function(){return p}):s&&(this[s]=p)}}({"3Fmxk":[function(e,t,r){e("2052da545d4d13eb").register(JSON.parse('{"OnXod":"survey-manager.75891dad.js","2DbDS":"survey-service.4e4c37f1.js","5GxHO":"survey.f682baf6.js","1CLKF":"auth-service.6d295210.js"}'))},{"2052da545d4d13eb":"i6vFE"}],i6vFE:[function(e,t,r){var o={};t.exports.register=function(e){for(var t=Object.keys(e),r=0;r<t.length;r++)o[t[r]]=e[t[r]]},t.exports.resolve=function(e){var t=o[e];if(null==t)throw Error("Could not resolve bundle with id "+e);return t}},{}],"7gWGx":[function(e,t,r){var o=e("@parcel/transformer-js/src/esmodule-helpers.js");o.defineInteropFlag(r),o.export(r,"initContentSurveyManager",()=>i),o.export(r,"triggerSurvey",()=>l);var n=e("../types/survey");class s{getSurveyData(){try{let e=localStorage.getItem(n.SURVEY_STORAGE_KEY);if(!e)return{surveyResponses:[],surveySettings:{enabled:!0}};return JSON.parse(e)}catch(e){return console.error("Error reading survey data:",e),{surveyResponses:[],surveySettings:{enabled:!0}}}}saveSurveyData(e){try{localStorage.setItem(n.SURVEY_STORAGE_KEY,JSON.stringify(e))}catch(e){console.error("Error saving survey data:",e)}}canShowSurvey(){let e=this.getSurveyData();if(!e.surveySettings.enabled)return!1;let t=Date.now();if(e.lastSurveyShown){let r=t-e.lastSurveyShown;if(r<n.SURVEY_COOLDOWN_MS)return!1}if(e.lastSurveyAnswered){let r=t-e.lastSurveyAnswered;if(r<n.SURVEY_COOLDOWN_MS)return!1}return!0}createSurveyHTML(){return`
      <div class="tablexport-survey-container" id="tablexport-survey-container" style="display: none;">
        <div class="tablexport-survey-modal" id="tablexport-survey-modal">
          <div id="tablexport-survey-content">
            <div class="tablexport-survey-header">
              <h3 class="tablexport-survey-title">
                Which feature matters most to you?
              </h3>
              <button class="tablexport-survey-close" id="tablexport-survey-close" title="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div class="tablexport-survey-options">
              ${(0,n.SURVEY_OPTIONS).map(e=>`
                <div class="tablexport-survey-option" data-option-id="${e.id}">
                  <div class="tablexport-survey-option-content">
                    <div class="tablexport-survey-option-emoji">${e.emoji}</div>
                    <div class="tablexport-survey-option-text">${e.text}</div>
                    <div class="tablexport-survey-radio"></div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
          <div id="tablexport-survey-thank-you" style="display: none;">
            <div class="tablexport-survey-thank-you">
              <div class="tablexport-survey-celebration">\ud83c</div>
              <h3 class="tablexport-survey-thank-title">
                Thank you for your feedback!
              </h3>
              <p class="tablexport-survey-thank-subtitle">
                You're helping us make TableXport better
              </p>
            </div>
          </div>
        </div>
      </div>
    `}addStyles(){let e="tablexport-survey-styles";if(document.getElementById(e))return;let t=document.createElement("style");t.id=e,t.textContent=`
      /* Survey Styles */
      .tablexport-survey-container {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        pointer-events: none;
      }

      .tablexport-survey-modal {
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        padding: 24px;
        width: 320px;
        max-width: calc(100vw - 40px);
        pointer-events: auto;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .tablexport-survey-modal.visible {
        transform: translateY(0);
        opacity: 1;
      }

      .tablexport-survey-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }

      .tablexport-survey-title {
        font-size: 16px;
        font-weight: 600;
        color: #062013;
        margin: 0;
        line-height: 1.3;
        flex: 1;
        padding-right: 12px;
      }

      .tablexport-survey-close {
        width: 24px;
        height: 24px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background-color 0.2s;
        flex-shrink: 0;
      }

      .tablexport-survey-close:hover {
        background-color: #f3f4f6;
      }

      .tablexport-survey-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .tablexport-survey-option {
        position: relative;
        cursor: pointer;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        padding: 14px 16px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        background: white;
      }

      .tablexport-survey-option:hover {
        border-color: #1B9358;
        background-color: #f8fdf9;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(27, 147, 88, 0.15);
      }

      .tablexport-survey-option.selected {
        border-color: #1B9358;
        background-color: #f0f9ff;
        box-shadow: 0 0 0 2px rgba(27, 147, 88, 0.2);
      }

      .tablexport-survey-option-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .tablexport-survey-option-emoji {
        font-size: 20px;
        line-height: 1;
        flex-shrink: 0;
      }

      .tablexport-survey-option-text {
        font-size: 14px;
        color: #062013;
        line-height: 1.4;
        flex: 1;
      }

      .tablexport-survey-radio {
        width: 18px;
        height: 18px;
        border: 2px solid #d1d5db;
        border-radius: 50%;
        background: white;
        position: relative;
        flex-shrink: 0;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .tablexport-survey-option:hover .tablexport-survey-radio {
        border-color: #1B9358;
      }

      .tablexport-survey-option.selected .tablexport-survey-radio {
        border-color: #1B9358;
        background-color: #1B9358;
      }

      .tablexport-survey-option.selected .tablexport-survey-radio::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
      }

      .tablexport-survey-thank-you {
        text-align: center;
        padding: 20px 0;
      }

      .tablexport-survey-celebration {
        font-size: 48px;
        margin-bottom: 16px;
        animation: tablexport-bounce 0.6s ease-out;
      }

      .tablexport-survey-thank-title {
        font-size: 16px;
        font-weight: 600;
        color: #062013;
        margin: 0 0 8px 0;
      }

      .tablexport-survey-thank-subtitle {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
        line-height: 1.4;
      }

      @keyframes tablexport-bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0, 0, 0);
        }
        40%, 43% {
          transform: translate3d(0, -12px, 0);
        }
        70% {
          transform: translate3d(0, -6px, 0);
        }
        90% {
          transform: translate3d(0, -2px, 0);
        }
      }

      @media (max-width: 480px) {
        .tablexport-survey-container {
          bottom: 16px;
          left: 16px;
          right: 16px;
        }

        .tablexport-survey-modal {
          width: 100%;
          max-width: none;
          padding: 20px;
        }
      }
    `,document.head.appendChild(t)}showSurvey(e){if(!this.canShowSurvey()){console.log("\uD83D\uDCCA Survey cannot be shown (cooldown or disabled)");return}this.currentExportContext=e;let t=this.getSurveyData();t.lastSurveyShown=Date.now(),this.saveSurveyData(t),this.surveyContainer||this.createSurveyContainer();let r=document.getElementById("tablexport-survey-container"),o=document.getElementById("tablexport-survey-modal"),n=document.getElementById("tablexport-survey-content"),s=document.getElementById("tablexport-survey-thank-you");r&&o&&n&&s&&(n.style.display="block",s.style.display="none",r.style.display="flex",setTimeout(()=>{o&&o.classList.add("visible")},10)),this.surveyState="showing",console.log("\u2705 Survey shown successfully")}createSurveyContainer(){this.addStyles();let e=document.getElementById("tablexport-survey-container");e&&e.remove();let t=document.createElement("div");t.innerHTML=this.createSurveyHTML();let r=t.firstElementChild;document.body.appendChild(r),this.surveyContainer=r,this.attachEventListeners()}attachEventListeners(){let e=document.getElementById("tablexport-survey-close");e&&e.addEventListener("click",()=>this.closeSurvey());let t=document.querySelectorAll(".tablexport-survey-option");t.forEach(e=>{e.addEventListener("click",e=>{let t=e.currentTarget.getAttribute("data-option-id");t&&this.selectOption(t)})}),document.addEventListener("keydown",e=>{"Escape"===e.key&&"showing"===this.surveyState&&this.closeSurvey()})}selectOption(e){let t=document.querySelectorAll(".tablexport-survey-option");t.forEach(e=>{e.classList.remove("selected")});let r=document.querySelector(`[data-option-id="${e}"]`);r&&r.classList.add("selected"),setTimeout(()=>{this.submitResponse(e)},300)}async submitResponse(t){let r=this.getSurveyData(),o={optionId:t,timestamp:Date.now(),exportContext:this.currentExportContext};r.surveyResponses.push(o),r.lastSurveyAnswered=Date.now(),this.saveSurveyData(r),this.showThankYou(),console.log("\uD83D\uDCCA Survey response submitted locally:",o);try{console.log("\uD83D\uDCE7 Sending survey response to server...");let{surveyService:r}=await e("42e6c5ba0ff524b1"),o=await r.submitSurveyResponseSimple(t,this.currentExportContext);o.success?console.log("\u2705 Survey response sent to server successfully"):console.error("\u274c Failed to send survey response to server:",o.error)}catch(e){console.error("\u274c Error sending survey response to server:",e)}}showThankYou(){let e=document.getElementById("tablexport-survey-content"),t=document.getElementById("tablexport-survey-thank-you");e&&t&&(e.style.display="none",t.style.display="block"),this.surveyState="thanking",setTimeout(()=>{this.closeSurvey()},3e3)}closeSurvey(){let e=document.getElementById("tablexport-survey-container"),t=document.getElementById("tablexport-survey-modal");t&&t.classList.remove("visible"),setTimeout(()=>{e&&(e.style.display="none"),this.surveyState="hidden"},400)}constructor(){this.surveyState="hidden",this.surveyContainer=null,this.currentExportContext=null}}let a=null,i=()=>{a||(a=new s,window.tablexportShowSurvey=e=>{console.log("\uD83D\uDCCA Triggering survey with context:",e),a?.showSurvey(e)},window.addEventListener("tablexport:survey-trigger",e=>{console.log("\uD83D\uDCE1 Survey trigger event received:",e.detail),a?.showSurvey(e.detail)}),console.log("\u2705 Content Survey Manager initialized"))},l=e=>{a?.showSurvey(e)}},{"../types/survey":"1mMDe","42e6c5ba0ff524b1":"5xQyv","@parcel/transformer-js/src/esmodule-helpers.js":"fRZO2"}],"1mMDe":[function(e,t,r){var o=e("@parcel/transformer-js/src/esmodule-helpers.js");o.defineInteropFlag(r),o.export(r,"SURVEY_STORAGE_KEY",()=>n),o.export(r,"SURVEY_COOLDOWN_MS",()=>s),o.export(r,"SURVEY_OPTIONS",()=>a);let n="tablexport-survey-data",s=864e5,a=[{id:"very-useful",text:"\u041e\u0447\u0435\u043d\u044c \u043f\u043e\u043b\u0435\u0437\u043d\u043e",description:"\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u0435 \u0437\u043d\u0430\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u0443\u043f\u0440\u043e\u0441\u0442\u0438\u043b\u043e \u0440\u0430\u0431\u043e\u0442\u0443",emoji:"\uD83D\uDE80"},{id:"useful",text:"\u041f\u043e\u043b\u0435\u0437\u043d\u043e",description:"\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u0435 \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u0432 \u0440\u0430\u0431\u043e\u0442\u0435",emoji:"\uD83D\uDC4D"},{id:"neutral",text:"\u041d\u0435\u0439\u0442\u0440\u0430\u043b\u044c\u043d\u043e",description:"\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u0435 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u043a\u0430\u043a \u043e\u0436\u0438\u0434\u0430\u043b\u043e\u0441\u044c",emoji:"\uD83D\uDE10"},{id:"not-useful",text:"\u041d\u0435 \u043e\u0447\u0435\u043d\u044c \u043f\u043e\u043b\u0435\u0437\u043d\u043e",description:"\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u0435 \u0438\u043c\u0435\u0435\u0442 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u043d\u0443\u044e \u043f\u043e\u043b\u044c\u0437\u0443",emoji:"\uD83E\uDD14"},{id:"not-useful-at-all",text:"\u0421\u043e\u0432\u0441\u0435\u043c \u043d\u0435 \u043f\u043e\u043b\u0435\u0437\u043d\u043e",description:"\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u0435 \u043d\u0435 \u043f\u0440\u0438\u043d\u043e\u0441\u0438\u0442 \u043f\u043e\u043b\u044c\u0437\u044b",emoji:"\uD83D\uDC4E"}]},{"@parcel/transformer-js/src/esmodule-helpers.js":"fRZO2"}],fRZO2:[function(e,t,r){r.interopDefault=function(e){return e&&e.__esModule?e:{default:e}},r.defineInteropFlag=function(e){Object.defineProperty(e,"__esModule",{value:!0})},r.exportAll=function(e,t){return Object.keys(e).forEach(function(r){"default"===r||"__esModule"===r||t.hasOwnProperty(r)||Object.defineProperty(t,r,{enumerable:!0,get:function(){return e[r]}})}),t},r.export=function(e,t,r){Object.defineProperty(e,t,{enumerable:!0,get:r})}},{}],"5xQyv":[function(e,t,r){t.exports=Promise.all([e("24afda377440cc33")(e("2a1f79c876b4f805").getBundleURL("OnXod")+e("d1f4ae0127b719a6").resolve("1CLKF")),e("24afda377440cc33")(e("2a1f79c876b4f805").getBundleURL("OnXod")+e("d1f4ae0127b719a6").resolve("2DbDS"))]).then(()=>t.bundle.root("1P0Vk"))},{"24afda377440cc33":"8Xj3B","2a1f79c876b4f805":"87g1w",d1f4ae0127b719a6:"i6vFE"}],"8Xj3B":[function(e,t,r){var o=e("ca2a84f7fa4a3bb0");t.exports=o(function(e){return new Promise(function(t,r){if([].concat(document.getElementsByTagName("script")).some(function(t){return t.src===e})){t();return}var o=document.createElement("link");o.href=e,o.rel="preload",o.as="script",document.head.appendChild(o);var n=document.createElement("script");n.async=!0,n.type="text/javascript",n.src=e,n.onerror=function(t){var o=TypeError("Failed to fetch dynamically imported module: ".concat(e,". Error: ").concat(t.message));n.onerror=n.onload=null,n.remove(),r(o)},n.onload=function(){n.onerror=n.onload=null,t()},document.getElementsByTagName("head")[0].appendChild(n)})})},{ca2a84f7fa4a3bb0:"c52pR"}],c52pR:[function(e,t,r){var o={},n={},s={};t.exports=function(e,t){return function(r){var a=function(e){switch(e){case"preload":return n;case"prefetch":return s;default:return o}}(t);return a[r]?a[r]:a[r]=e.apply(null,arguments).catch(function(e){throw delete a[r],e})}}},{}],"87g1w":[function(e,t,r){var o={};function n(e){return(""+e).replace(/^((?:https?|file|ftp|(chrome|moz|safari-web)-extension):\/\/.+)\/[^/]+$/,"$1")+"/"}r.getBundleURL=function(e){var t=o[e];return t||(t=function(){try{throw Error()}catch(t){var e=(""+t.stack).match(/(https?|file|ftp|(chrome|moz|safari-web)-extension):\/\/[^)\n]+/g);if(e)return n(e[2])}return"/"}(),o[e]=t),t},r.getBaseURL=n,r.getOrigin=function(e){var t=(""+e).match(/(https?|file|ftp|(chrome|moz|safari-web)-extension):\/\/[^/]+/);if(!t)throw Error("Origin not found");return t[0]}},{}]},["3Fmxk","7gWGx"],"7gWGx","parcelRequire709e"),globalThis.define=t;