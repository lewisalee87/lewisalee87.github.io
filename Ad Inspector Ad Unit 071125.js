(function() {
  const logoUrl = "https://i.postimg.cc/nVXZRgP5/Ad-Tech-Logo-200x200.jpg";

  /* ---- Global table styles ---- */
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
    .adtech-h4 { margin: 10px 0 4px; }
  `;
  document.head.appendChild(styleEl);

  /* ---------- Styling & Modal Helpers ---------- */
  function styleButton(btn) {
    btn.style.background = '#007bff';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.padding = '8px 14px';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.width = '100%';
    btn.style.margin = '5px 0';
    btn.onmouseover = () => btn.style.background = '#0056b3';
    btn.onmouseout = () => btn.style.background = '#007bff';
  }

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

  function createModal(title, contentNode, backAction) {
    const modal = document.createElement('div');
    Object.assign(modal.style, {
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 10000
    });
    modal.className = 'adtech-modal';
    const box = document.createElement('div');
    Object.assign(box.style, {
      background: 'white', borderRadius: '8px', width: '950px',
      maxHeight: '80%', display: 'flex', flexDirection: 'column',
      fontFamily: 'Arial, sans-serif', overflow: 'hidden'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 15px', background: '#f5f5f5', borderBottom: '1px solid #ddd'
    });
    const titleEl = document.createElement('h3');
    titleEl.style.margin = '0'; titleEl.innerText = title;
    const branding = document.createElement('div');
    branding.style.display = 'flex'; branding.style.alignItems = 'center';
    branding.innerHTML = `<img src="${logoUrl}" style="width:20px;height:20px;border-radius:50%;margin-right:5px;">
                           <span style="font-size:12px;color:#666;">powered by AdTech</span>`;
    header.appendChild(titleEl); header.appendChild(branding);

    const contentWrapper = document.createElement('div');
    Object.assign(contentWrapper.style, { padding: '15px', overflowY: 'auto', flex: 1 });
    contentWrapper.appendChild(contentNode);

    const footer = document.createElement('div');
    Object.assign(footer.style, { borderTop: '1px solid #ddd', padding: '10px', textAlign: 'right' });
    if (backAction) {
      const backBtn = document.createElement('button');
      backBtn.innerText = 'Back';
      styleButton(backBtn); backBtn.style.width = 'auto';
      backBtn.onclick = () => { document.body.removeChild(modal); backAction(); };
      footer.appendChild(backBtn);
    }
    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Close';
    styleButton(closeBtn); closeBtn.style.width = 'auto';
    closeBtn.onclick = () => document.body.removeChild(modal);
    footer.appendChild(closeBtn);

    box.appendChild(header); box.appendChild(contentWrapper); box.appendChild(footer);
    modal.appendChild(box);
    document.body.appendChild(modal);
    return modal; // so we can query it later
  }

  /* ---- GPT / Prebid / Tealium Helpers ---- */
  const getSlotInfoByElement = el => window.googletag?.pubads?.().getSlots()
    .find(s => s.getSlotElementId() === el.id) || null;
  const getTealiumData = () => window.utag?.data || null;

  function getGoogleQueryId(slotEl) {
    let queryId = slotEl.getAttribute('data-google-query-id');
    if (!queryId && slotEl.parentElement) {
      queryId = slotEl.parentElement.getAttribute('data-google-query-id');
    }
    if (!queryId) {
      const childWithQueryId = slotEl.querySelector('[data-google-query-id]');
      if (childWithQueryId) queryId = childWithQueryId.getAttribute('data-google-query-id');
    }
    return queryId || 'Not found';
  }

  /* ---- Added: Prebid data extractor ---- */
  function getPrebidDataDetailed(slotId) {
    if (!window.pbjs || typeof pbjs.getBidResponses !== 'function') return [];
    const bidResponses = pbjs.getBidResponses();
    const slotData = bidResponses[slotId] || { bids: [] };
    return slotData.bids.map(b => ({
      bidder: b.bidder || '',
      cpm: b.cpm || '',
      time: b.responseTimestamp ? (b.responseTimestamp - b.requestTimestamp) : '',
      msg: b.statusMessage || '',
      rendered: !!b.ad,
      size: b.size || '',
      dealId: b.dealId || '',
      adId: b.adId || '',
      adomain: (b.adomain && b.adomain.join(', ')) || ''
    }));
  }

  /* ---- Menu ---- */
  function openMenu(slotEl) {
    const container = document.createElement('div');
    const items = [
      ['Run report', () => alert('Report placeholder')],
      ['Show ad details', () => openDetails(slotEl)],
      ['Show Prebid', () => openPrebid(slotEl)],
      ['Show Tealium data', () => openTealium(slotEl)],
      ['Log a ticket', () => alert('Ticket placeholder')]
    ];
    items.forEach(([label, fn]) => {
      const btn = document.createElement('button');
      btn.innerText = label; styleButton(btn);
      btn.onclick = () => { const m = document.querySelector('.adtech-modal'); if (m) document.body.removeChild(m); setTimeout(fn,0); };
      container.appendChild(btn);
    });
    createModal('Ad Slot Actions', container);
  }

  /* ---- Ad Details (Google Query ID etc) ---- */
  function openDetails(slotEl) {
    const slotInfo = getSlotInfoByElement(slotEl);
    const googleQueryId = getGoogleQueryId(slotEl);
    const container = document.createElement('div');

    let html = `<div style="background:#e3f2fd;padding:10px;border-radius:4px;margin-bottom:15px;border-left:4px solid #2196F3;">
                 <strong style="color:#1565c0;font-size:13px;">Google Query ID:</strong><br>
                 <span style="font-size:12px;color:#333;word-break:break-all;">${googleQueryId}</span>`;
    if (googleQueryId !== 'Not found') {
      html += `<br><button id="copyQueryIdBtn" style="margin-top:8px;padding:5px 12px;font-size:11px;background:#2196F3;color:white;border:none;border-radius:3px;cursor:pointer;">Copy Query ID</button>`;
    }
    html += `</div>`;

    if (slotInfo) {
      html += `<div style="background:#f5f5f5;padding:10px;border-radius:4px;margin-bottom:10px;">
                <strong>Ad Unit Path:</strong> ${slotInfo.getAdUnitPath()}<br>
                <strong>Slot ID:</strong> ${slotInfo.getSlotElementId()}<br>
                <strong>Sizes:</strong> ${slotInfo.getSizes().map(s => Array.isArray(s) ? s.join('x') : s).join(', ')}
               </div>`;
      const targetingKeys = slotInfo.getTargetingKeys();
      if (targetingKeys.length) {
        html += `<div style="background:#fff3e0;padding:10px;border-radius:4px;margin-bottom:10px;border-left:4px solid #FF9800;">
                  <strong style="color:#e65100;">Targeting:</strong><br>`;
        targetingKeys.forEach(key => {
          html += `<span style="color:#666;">${key}:</span> ${slotInfo.getTargeting(key).join(', ')}<br>`;
        });
        html += `</div>`;
      }
      const info = slotInfo.getResponseInformation?.();
      if (info) {
        html += `<div style="background:#e8f5e9;padding:10px;border-radius:4px;margin-bottom:10px;border-left:4px solid #4CAF50;">
                  <strong style="color:#2e7d32;">Response Info:</strong><br>
                  <strong>Creative ID:</strong> ${info.creativeId || 'N/A'}<br>
                  <strong>Line Item ID:</strong> ${info.lineItemId || 'N/A'}`;
        if (info.advertiserId) html += `<br><strong>Advertiser ID:</strong> ${info.advertiserId}`;
        if (info.campaignId) html += `<br><strong>Campaign ID:</strong> ${info.campaignId}`;
        html += `</div>`;
      }
    } else {
      html += `<div style="background:#ffebee;padding:10px;border-radius:4px;color:#c62828;">No GPT slot matched for element ID: ${slotEl.id}</div>`;
    }
    container.innerHTML = html;

    const modal = createModal('Ad Slot Details', container);
    const copyBtn = modal.querySelector('#copyQueryIdBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(googleQueryId).then(() => {
          copyBtn.textContent = '✓ Copied!'; copyBtn.style.background = '#4CAF50';
          setTimeout(() => { copyBtn.textContent = 'Copy Query ID'; copyBtn.style.background = '#2196F3'; }, 2000);
        });
      });
    }
  }

  /* ---- Prebid modal ---- */
  function openPrebid(slotEl) {
    const bids = getPrebidDataDetailed(slotEl.id);
    const pbTabs = document.createElement('div');
    pbTabs.innerHTML = `<style>
      .pbtabs{display:flex;border-bottom:1px solid #ccc;}
      .pbtabs button{flex:1;padding:6px;cursor:pointer;border:none;}
      .pbtabs button.active{background:#fff;font-weight:bold;}
      .pbtab-content{display:none;padding:10px;}
      .pbtab-content.active{display:block;}
    </style>
    <div class="pbtabs">
      <button data-tab="bids" class="active">Bids</button>
      <button data-tab="uids">User IDs</button>
    </div>
    <div id="pb-bids" class="pbtab-content active"></div>
    <div id="pb-uids" class="pbtab-content"></div>`;

    const bidsContainer = pbTabs.querySelector('#pb-bids');
    if (!bids.length) {
      bidsContainer.innerHTML = '<p>No Prebid data found.</p>';
    } else {
      let html = `<table class="adtech-table"><tr>
        <th>Bidder</th><th>CPM</th><th>Time (ms)</th><th>Status</th>
        <th>Rendered</th><th>Size</th><th>Deal ID</th><th>Ad ID</th><th>Adomain</th></tr>`;
      bids.forEach(b => {
        html += `<tr><td>${b.bidder}</td><td>${b.cpm}</td><td>${b.time}</td>
                 <td>${b.msg}</td><td>${b.rendered ? '✅' : ''}</td>
                 <td>${b.size}</td><td>${b.dealId}</td><td>${b.adId}</td><td>${b.adomain}</td></tr>`;
      });
      html += '</table>';
      bidsContainer.innerHTML = html;
    }

    const uidsContainer = pbTabs.querySelector('#pb-uids');
    if (typeof pbjs?.getUserIds === 'function') {
      const userIds = pbjs.getUserIds();
      if (userIds && Object.keys(userIds).length) {
        const uidRows = Object.entries(userIds).map(([prov, val]) => {
          let displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
          return { Provider: prov, ID: displayVal };
        });
        uidsContainer.innerHTML = createKVTable(uidRows);
      } else {
        uidsContainer.innerHTML = '<p>No user IDs found in Prebid.</p>';
      }
    } else {
      uidsContainer.innerHTML = '<p>pbjs.getUserIds() not available.</p>';
    }

    pbTabs.querySelectorAll('.pbtabs button').forEach(b => b.onclick = () => {
      pbTabs.querySelectorAll('.pbtabs button').forEach(bb => bb.classList.remove('active'));
      pbTabs.querySelectorAll('.pbtab-content').forEach(tc => tc.classList.remove('active'));
      b.classList.add('active');
      pbTabs.querySelector('#pb-' + b.dataset.tab).classList.add('active');
    });

    createModal(`Prebid – ${slotEl.id}`, pbTabs, () => openMenu(slotEl));
  }

  /* ---- Tealium modal ---- */
  function openTealium(slotEl) {
    const tealiumData = getTealiumData() || {}, tealiumTags = window.TealiumTags || [];
    const tabs = document.createElement('div');
    tabs.innerHTML = `<style>
      .adtabs{display:flex;border-bottom:1px solid #ccc;}
      .adtabs button{flex:1;padding:6px;cursor:pointer;border:none;}
      .adtabs button.active{background:#fff;font-weight:bold;}
      .adtab-content{display:none;padding:10px;}
      .adtab-content.active{display:block;}
    </style>
    <div class="adtabs">
      <button data-tab="tags" class="active">Tags</button>
      <button data-tab="attrs">Page Attributes</button>
      <button data-tab="user">User Info</button>
      <button data-tab="other">Other Details</button>
    </div>
    <div id="t-tags" class="adtab-content active"></div>
    <div id="t-attrs" class="adtab-content"></div>
    <div id="t-user" class="adtab-content"></div>
    <div id="t-other" class="adtab-content"></div>`;

    tabs.querySelector('#t-tags').innerHTML = createTableFromArrayOfObjects(tealiumTags);
    let targeting = {};
    if (location.href.includes('realestate.com.au')) targeting = window.REA?.targeting || {};
    else if (location.href.includes('realcommercial.com.au')) targeting = window.RCA?.targeting || {};
    tabs.querySelector('#t-attrs').innerHTML = createKVTable(Object.entries(targeting).map(([k, v]) => ({ [k]: v })));

    const uTop = [{ 'REAUID': tealiumData['cp.reauid'] || '' }, { 'User Agent': navigator.userAgent }];
    const medias = [], others = [];
    for (let k in tealiumData) {
      if (k.startsWith('va.audience')) {
        const segVal = tealiumData[k];
        if (typeof segVal === 'string' && segVal[0] === 'm') medias.push({ [k.replace('va.audience.', '')]: segVal });
        else others.push({ [k.replace('va.audience.', '')]: segVal });
      }
    }
    let uhtml = `<h4>Basic</h4>${createKVTable(uTop)}`;
    if (medias.length) uhtml += `<h4>Media Segments</h4>${createKVTable(medias)}`;
    if (others.length) uhtml += `<h4>Other Segments</h4>${createKVTable(others)}`;
    tabs.querySelector('#t-user').innerHTML = uhtml;

    const otherArr = [
      { 'Version': tealiumData['ut.version'] },
      { 'Account': tealiumData.tealium_account },
      { 'Environment': tealiumData.tealium_environment },
      { 'Profile': tealiumData['ut.profile'] },
      { 'Tealium Visitor ID': tealiumData['tealium_visitor_id'] },
      { 'Tealium Session ID': tealiumData['tealium_session_id'] },
      { 'LockeID': tealiumData.udo_backup?.user?.data?.locke_id || '' }
    ];
    try {
      const vaLS = localStorage.getItem('tealium_va');
      if (vaLS) {
        const vaObj = JSON.parse(vaLS), props = vaObj.properties || {};
        if (props['11353']) otherArr.push({ 'UID2 Token': props['11353'] });
        if (props['21282734']) otherArr.push({ 'PAIR ID': props['21282734'] });
        if (props['10756']) otherArr.push({ 'ID5': props['10756'] });
        if (props['21281639']) otherArr.push({ 'Liveramp Envelope': props['21281639'] });
      }
    } catch (e) { console.warn('Unable to parse tealium_va from localStorage', e); }
    tabs.querySelector('#t-other').innerHTML = createKVTable(otherArr);

    tabs.querySelectorAll('.adtabs button').forEach(b => b.onclick = () => {
      tabs.querySelectorAll('.adtabs button').forEach(bb => bb.classList.remove('active'));
      tabs.querySelectorAll('.adtab-content').forEach(tc => tc.classList.remove('active'));
      b.classList.add('active');
      tabs.querySelector('#t-' + b.dataset.tab).classList.add('active');
    });

    createModal('Tealium Data', tabs, () => openMenu(slotEl));
  }

  /* ---- Overlay ---- */
  function createIcon(slotEl) {
    slotEl.style.outline = '5px solid #00FF33';
    slotEl.style.outlineOffset = '5px';
    const icon = document.createElement('img');
    icon.src = logoUrl;
    icon.style.width = '20px'; icon.style.height = '20px';
    icon.style.background = 'white';
    icon.style.border = '1px solid #ccc';
    icon.style.borderRadius = '50%';
    icon.style.padding = '2px';
    icon.style.cursor = 'pointer';
    icon.style.zIndex = '9999';
    icon.style.position = 'absolute';
    icon.title = 'Ad slot debug menu';
    const refButton = slotEl.querySelector(
      'img[alt*="AdChoices" i], img[alt*="Close" i], .adchoices, .close, svg'
    );
    if (refButton) {
      const slotRect = slotEl.getBoundingClientRect();
      const refRect = refButton.getBoundingClientRect();
      icon.style.top = `${refRect.top - slotRect.top}px`;
      icon.style.right = `${(slotRect.right - refRect.right) + 24}px`;
    } else {
      icon.style.top = '5px';
      icon.style.right = '5px';
    }
    icon.addEventListener('click', function(e) {
      e.stopPropagation();
      openMenu(slotEl);
    });
    slotEl.style.position = 'relative';
    slotEl.appendChild(icon);
  }

  function scanSlots() {
    const selectors = 'div[id^="gpt-ad"], div[data-google-query-id], div[id*="ad-container"], div[data-testid="advertisement"]';
    document.querySelectorAll(selectors).forEach(slotEl => {
      if (!slotEl.dataset.overlayInjected) {
        createIcon(slotEl);
        slotEl.dataset.overlayInjected = 'true';
      }
    });
  }
  scanSlots();
  new MutationObserver(scanSlots).observe(document.body, { childList: true, subtree: true });
  if (window.googletag && googletag.pubads) {
    googletag.pubads().addEventListener('slotRenderEnded', scanSlots);
  }
})();
