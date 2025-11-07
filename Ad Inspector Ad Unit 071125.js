(function() {
  const logoUrl = "https://i.postimg.cc/nVXZRgP5/Ad-Tech-Logo-200x200.jpg";

  /* Inject uniform table styles */
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .adtech-table {
      border-collapse: collapse;
      width: 100%;
      text-align: left;
      margin: 6px 0;
      font-size: 13px;
    }
    .adtech-table th, .adtech-table td {
      border: 1px solid #ccc;
      padding: 4px 6px;
      vertical-align: top;
    }
    .adtech-table th {
      background: #f9f9f9;
      font-weight: bold;
    }
  `;
  document.head.appendChild(styleEl);

  /* ---------------- Table builder helpers ---------------- */
  function createKVTable(arr) {
    if (!arr.length) return '<p>No data</p>';
    let html = '<table class="adtech-table"><tr><th>Key</th><th>Value</th></tr>';
    arr.forEach(obj => {
      const key = Object.keys(obj)[0], val = obj[key];
      html += `<tr><td>${key}</td><td>${val}</td></tr>`;
    });
    html += '</table>';
    return html;
  }

  function createTableFromArrayOfObjects(arr) {
    if (!arr.length) return '<p>No data</p>';
    const keys = Array.from(new Set(arr.flatMap(obj => Object.keys(obj))));
    let html = `<table class="adtech-table"><thead><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr></thead><tbody>`;
    arr.forEach(row => {
      html += `<tr>${keys.map(k => `<td>${row[k] !== undefined ? row[k] : ''}</td>`).join('')}</tr>`;
    });
    html += '</tbody></table>';
    return html;
  }

  /* ---------------- Modal wrapper ---------------- */
  function createModal(contentHtml) {
    const modal = document.createElement('div');
    Object.assign(modal.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: '10000'
    });
    const content = document.createElement('div');
    Object.assign(content.style, {
      background: 'white', padding: '20px', borderRadius: '6px',
      minWidth: '400px', maxWidth: '950px', maxHeight: '80vh',
      overflow: 'auto', fontFamily: 'Arial, sans-serif'
    });
    content.innerHTML = contentHtml;
    modal.appendChild(content);
    document.body.appendChild(modal);
    return modal;
  }

  /* ---------------- GPT data helpers ---------------- */
  const getSlotInfoByElement = el =>
    window.googletag?.pubads?.().getSlots().find(s => s.getSlotElementId() === el.id) || null;

  function getGoogleQueryId(slotEl) {
    let queryId = slotEl.getAttribute('data-google-query-id');
    if (!queryId && slotEl.parentElement) queryId = slotEl.parentElement.getAttribute('data-google-query-id');
    if (!queryId) {
      const child = slotEl.querySelector('[data-google-query-id]');
      if (child) queryId = child.getAttribute('data-google-query-id');
    }
    return queryId || 'Not found';
  }

  /* ---------------- Prebid data helpers ---------------- */
  function getPrebidDataDetailed(slotId) {
    if (!window.pbjs) return [];
    const winners = pbjs.getAllWinningBids?.() || [];
    const output = [];
    function forEach(resps, cb) {
      Object.keys(resps).forEach(code => {
        const r = resps[code];
        if (r?.bids) r.bids.forEach(b => cb(code, b));
      });
    }
    forEach(pbjs.getBidResponses(), (code,bid) => {
      if (code === slotId) {
        output.push({
          bidder: bid.bidder, adId: bid.adId, cpm: bid.cpm, time: bid.timeToRespond,
          msg: bid.statusMessage,
          size: bid.width && bid.height ? `${bid.width}x${bid.height}` : '',
          dealId: bid.dealId || '',
          rendered: !!winners.find(w => w.adId === bid.adId),
          adomain: bid.meta?.advertiserDomains?.join(', ') || ''
        });
      }
    });
    if (pbjs.getNoBids) {
      forEach(pbjs.getNoBids(), (code,bid) => {
        if(code===slotId){
          output.push({ bidder: bid.bidder, adId: bid.bidId, cpm: '', time: '', msg: 'no bid', size: '', dealId: '', rendered: false, adomain: '' });
        }
      });
    }
    return output;
  }

  /* ---------------- Tealium data helpers ---------------- */
  const getTealiumData = () => window.utag?.data || null;

  /* ---------------- Overlay click menu ---------------- */
  function openMenu(slotEl) {
    const hasPrebid = getPrebidDataDetailed(slotEl.id).length > 0;
    const hasTealium = !!getTealiumData();
    let menuHtml = `<h3>Ad Slot Actions</h3>
      <p>Select an action for slot <strong>${slotEl.id || '(no ID)'}</strong></p>
      <button id="btnReport" style="display:block;width:100%;margin:5px 0;">Run report</button>
      <button id="btnDetails" style="display:block;width:100%;margin:5px 0;">Show ad details</button>`;
    if (hasPrebid) menuHtml += `<button id="btnPrebid" style="display:block;width:100%;margin:5px 0;">Show Prebid</button>`;
    if (hasTealium) menuHtml += `<button id="btnTealium" style="display:block;width:100%;margin:5px 0;">Show Tealium</button>`;
    menuHtml += `<button id="btnLog" style="display:block;width:100%;margin:5px 0;">Log a ticket</button>
      <br><button id="closeModal" style="margin-top:10px;padding:5px 10px;">Close</button>`;
    const modal = createModal(menuHtml);

    modal.querySelector('#btnDetails').onclick = () => { document.body.removeChild(modal); setTimeout(()=>openDetails(slotEl),0); };
    if (hasPrebid) modal.querySelector('#btnPrebid').onclick = () => { document.body.removeChild(modal); setTimeout(()=>openPrebid(slotEl),0); };
    if (hasTealium) modal.querySelector('#btnTealium').onclick = () => { document.body.removeChild(modal); setTimeout(()=>openTealium(slotEl),0); };
    modal.querySelector('#closeModal').onclick = () => document.body.removeChild(modal);

    modal.querySelector('#btnReport').onclick = () => alert('Report placeholder');
    modal.querySelector('#btnLog').onclick = () => alert('Ticket logging placeholder');
  }

  /* ---------------- GPT Ad Details modal ---------------- */
  function openDetails(slotEl) {
    const slotInfo = getSlotInfoByElement(slotEl);
    const qId = getGoogleQueryId(slotEl);
    let html = `<h3>Ad Slot Details</h3>
      <div style="background:#e3f2fd;padding:10px;border-radius:4px;margin-bottom:15px;border-left:4px solid #2196F3;">
        <strong style="color:#1565c0;">Google Query ID:</strong><br>
        <span style="font-size:12px;color:#333;word-break:break-all;">${qId}</span>`;
    if (qId !== 'Not found') {
      html += `<br><button id="copyQid" style="margin-top:8px;padding:4px 8px;font-size:11px;background:#2196F3;color:white;border:none;border-radius:3px;cursor:pointer;">📋 Copy Query ID</button>`;
    }
    html += `</div>`;

    if (slotInfo) {
      html += `<div style="background:#f5f5f5;padding:10px;border-radius:4px;margin-bottom:10px;">
        <strong>Ad Unit Path:</strong> ${slotInfo.getAdUnitPath()}<br>
        <strong>Slot ID:</strong> ${slotInfo.getSlotElementId()}<br>
        <strong>Sizes:</strong> ${slotInfo.getSizes().map(s => Array.isArray(s)?s.join('x'):s).join(', ')}
      </div>`;

      const tKeys = slotInfo.getTargetingKeys();
      if (tKeys.length) {
        html += `<div style="background:#fff3e0;padding:10px;border-radius:4px;margin-bottom:10px;border-left:4px solid #FF9800;">
          <strong style="color:#e65100;">Targeting:</strong><br>`;
        tKeys.forEach(key => html += `<span style="color:#666;">${key}:</span> ${slotInfo.getTargeting(key).join(', ')}<br>`);
        html += `</div>`;
      }

      const info = slotInfo.getResponseInformation?.();
      if (info) {
        html += `<div style="background:#e8f5e9;padding:10px;border-radius:4px;margin-bottom:10px;border-left:4px solid #4CAF50;">
          <strong style="color:#2e7d32;">Response Info:</strong><br>
          <strong>Creative ID:</strong> ${info.creativeId || 'N/A'}<br>
          <strong>Line Item ID:</strong> ${info.lineItemId || 'N/A'}<br>`;
        if (info.advertiserId) html += `<strong>Advertiser ID:</strong> ${info.advertiserId}<br>`;
        if (info.campaignId) html += `<strong>Campaign ID:</strong> ${info.campaignId}<br>`;
        html += `</div>`;
      }
    } else {
      html += `<div style="background:#ffebee;padding:10px;border-radius:4px;color:#c62828;">
        ⚠ No GPT slot matched for ID: ${slotEl.id}
      </div>`;
    }
    html += `<div style="margin-top:15px;">
      <button id="backBtn" style="padding:6px 12px;margin-right:10px;background:#757575;color:white;border:none;border-radius:3px;cursor:pointer;">← Back</button>
      <button id="closeModal" style="padding:6px 12px;background:#f44336;color:white;border:none;border-radius:3px;cursor:pointer;">✕ Close</button>
    </div>`;
    const modal = createModal(html);
    const copyBtn = modal.querySelector('#copyQid');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(qId).then(() => {
          copyBtn.innerText = '✓ Copied!';
          copyBtn.style.background = '#4CAF50';
          setTimeout(() => { copyBtn.innerText = '📋 Copy Query ID'; copyBtn.style.background = '#2196F3'; }, 1500);
        });
      };
    }
    modal.querySelector('#backBtn').onclick = () => { document.body.removeChild(modal); openMenu(slotEl); };
    modal.querySelector('#closeModal').onclick = () => { document.body.removeChild(modal); };
  }

  /* ---------------- Prebid modal (Bids + User IDs) ---------------- */
  function openPrebid(slotEl) {
    const bids = getPrebidDataDetailed(slotEl.id);
    const pbTabs = document.createElement('div');
    pbTabs.innerHTML = `<div class="pbtabs" style="display:flex;border-bottom:1px solid #ccc;">
      <button data-tab="bids" class="active" style="flex:1;padding:6px;">Bids</button>
      <button data-tab="uids" style="flex:1;padding:6px;">User IDs</button>
    </div>
    <div id="pb-bids" class="pbtab-content active"></div>
    <div id="pb-uids" class="pbtab-content"></div>`;

    pbTabs.querySelector('#pb-bids').innerHTML = bids.length ? createKVTable(bids) : '<p>No Prebid data for this slot.</p>';
    const uidsContainer = pbTabs.querySelector('#pb-uids');
    if (typeof pbjs?.getUserIds === 'function') {
      const ids = pbjs.getUserIds();
      uidsContainer.innerHTML = Object.keys(ids).length ? createKVTable(Object.entries(ids).map(([k,v])=>({Provider:k,ID:typeof v==='object'?JSON.stringify(v):v}))) : '<p>No user IDs found.</p>';
    } else uidsContainer.innerHTML = '<p>pbjs.getUserIds() not available.</p>';

    pbTabs.querySelectorAll('.pbtabs button').forEach(btn => btn.onclick = () => {
      pbTabs.querySelectorAll('.pbtabs button').forEach(b=>b.classList.remove('active'));
      pbTabs.querySelectorAll('.pbtab-content').forEach(tc=>tc.classList.remove('active'));
      btn.classList.add('active'); pbTabs.querySelector('#pb-' + btn.dataset.tab).classList.add('active');
    });

    const modal = createModal(pbTabs.outerHTML);
    modal.querySelectorAll('.pbtabs button').forEach(btn => btn.onclick = () => {
      modal.querySelectorAll('.pbtabs button').forEach(b=>b.classList.remove('active'));
      modal.querySelectorAll('.pbtab-content').forEach(tc=>tc.classList.remove('active'));
      btn.classList.add('active'); modal.querySelector('#pb-' + btn.dataset.tab).classList.add('active');
    });
  }

  /* ---------------- Tealium modal ---------------- */
  function openTealium(slotEl) {
    const tData = getTealiumData() || {}, tTags = window.TealiumTags || [];
    const tabs = document.createElement('div');
    tabs.innerHTML = `<div class="adtabs" style="display:flex;border-bottom:1px solid #ccc;">
      <button data-tab="tags" class="active" style="flex:1;padding:6px;">Tags</button>
      <button data-tab="attrs" style="flex:1;padding:6px;">Page Attrs</button>
      <button data-tab="user" style="flex:1;padding:6px;">User Info</button>
      <button data-tab="other" style="flex:1;padding:6px;">Other Details</button>
    </div>
    <div id="t-tags" class="adtab-content active"></div>
    <div id="t-attrs" class="adtab-content"></div>
    <div id="t-user" class="adtab-content"></div>
    <div id="t-other" class="adtab-content"></div>`;

    tabs.querySelector('#t-tags').innerHTML = createTableFromArrayOfObjects(tTags);
    let targeting = {};
    if (location.href.includes('realestate.com.au')) targeting = window.REA?.targeting || {};
    else if (location.href.includes('realcommercial.com.au')) targeting = window.RCA?.targeting || {};
    tabs.querySelector('#t-attrs').innerHTML = createKVTable(Object.entries(targeting).map(([k,v])=>({[k]:v})));

    const uTop=[{'REAUID':tData['cp.reauid']||''},{'User Agent':navigator.userAgent}], medias=[], others=[];
    for(let k in tData){
      if(k.startsWith('va.audience')){
        const v=tData[k];
        (typeof v==='string' && v[0]==='m'?medias:others).push({[k.replace('va.audience.','')]:v});
      }
    }
    let uhtml = `<h4>Basic</h4>${createKVTable(uTop)}`;
    if(medias.length) uhtml += `<h4>Media Segments</h4>${createKVTable(medias)}`;
    if(others.length) uhtml += `<h4>Other Segments</h4>${createKVTable(others)}`;
    tabs.querySelector('#t-user').innerHTML = uhtml;

    const otherArr = [
      {'Version': tData['ut.version']},
      {'Account': tData.tealium_account},
      {'Environment': tData.tealium_environment},
      {'Profile': tData['ut.profile']},
      {'Tealium Visitor ID': tData['tealium_visitor_id']},
      {'Tealium Session ID': tData['tealium_session_id']},
      {'LockeID': tData.udo_backup?.user?.data?.locke_id || ''}
    ];
    try {
      const vaLS = localStorage.getItem('tealium_va');
      if (vaLS) {
        const props = JSON.parse(vaLS).properties || {};
        if(props['11353']) otherArr.push({'UID2 Token':props['11353']});
        if(props['21282734']) otherArr.push({'PAIR ID':props['21282734']});
        if(props['10756']) otherArr.push({'ID5':props['10756']});
        if(props['21281639']) otherArr.push({'Liveramp Envelope':props['21281639']});
      }
    } catch(e){ console.warn('Parse tealium_va failed', e); }
    tabs.querySelector('#t-other').innerHTML = createKVTable(otherArr);

    tabs.querySelectorAll('.adtabs button').forEach(btn => btn.onclick = () => {
      tabs.querySelectorAll('.adtabs button').forEach(b=>b.classList.remove('active'));
      tabs.querySelectorAll('.adtab-content').forEach(tc=>tc.classList.remove('active'));
      btn.classList.add('active'); tabs.querySelector('#t-'+btn.dataset.tab).classList.add('active');
    });

    createModal(tabs.outerHTML);
  }

  /* ---------------- Overlay icon ---------------- */
  function createIcon(slotEl) {
    slotEl.style.outline = '5px solid #00FF33'; slotEl.style.outlineOffset = '5px';
    const icon = document.createElement('img');
    Object.assign(icon.style, {width:'20px',height:'20px',background:'white',border:'1px solid #ccc',borderRadius:'50%',padding:'2px',cursor:'pointer',zIndex:'9999',position:'absolute'});
    icon.src = logoUrl; icon.title = 'Ad slot debug menu';
    const refButton = slotEl.querySelector('img[alt*="AdChoices" i], img[alt*="Close" i], .adchoices, .close, svg');
    if (refButton) {
      const sr = slotEl.getBoundingClientRect(), rr = refButton.getBoundingClientRect();
      icon.style.top = `${rr.top - sr.top}px`; icon.style.right = `${(sr.right - rr.right) + 24}px`;
    } else { icon.style.top = '5px'; icon.style.right = '5px'; }
    icon.onclick = e => { e.stopPropagation(); openMenu(slotEl); };
    slotEl.style.position = 'relative';
    slotEl.appendChild(icon);
  }

  function scanSlots() {
    const selectors = 'div[id^="gpt-ad"], div[data-google-query-id], div[id*="ad-container"], div[data-testid="advertisement"]';
    document.querySelectorAll(selectors).forEach(slotEl => {
      if (!slotEl.dataset.overlayInjected) { createIcon(slotEl); slotEl.dataset.overlayInjected = 'true'; }
    });
  }
  scanSlots();
  new MutationObserver(scanSlots).observe(document.body, { childList:true, subtree:true });
  window.googletag?.pubads?.().addEventListener('slotRenderEnded', scanSlots);
})();