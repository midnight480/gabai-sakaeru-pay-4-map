// ===================================================
// がばいサカえーるPay 第4弾マップ - メインスクリプト
// ===================================================

// カテゴリ別マーカー色のマッピング
const CATEGORY_COLORS = {
    '飲食店': '#E53935',
    '住まい': '#5C6BC0',
    '家具・寝具・家電': '#7E57C2',
    '教育・文化': '#26A69A',
    '広告・印刷・写真': '#78909C',
    'テイクアウト専門店': '#FF7043',
    '健康・医療・薬局': '#42A5F5',
    '食品・飲料': '#FFA726',
    'ホームセンター 日用品・リサイクル': '#8D6E63',
    '自動車・バイク・自転車・修理工場': '#546E7A',
    'ガソリン・石油・プロパン': '#EF5350',
    '生活・趣味・書店・冠婚葬祭': '#AB47BC',
    '衣料・靴・カバン': '#EC407A',
    '時計・宝石・貴金属・眼鏡': '#FFD54F',
    '理容・美容・エステ・ビューティー': '#F48FB1',
    'クリーニング・補修・レンタル': '#90A4AE',
    '菓子・贈答': '#FF8A65',
    '宿泊・温泉': '#4DB6AC',
    'タクシー・旅行・観光': '#29B6F6',
    'カラオケ・ボウリング': '#CE93D8',
    '百貨店 コンビニ・スーパー': '#66BB6A',
    '雑貨・アート・文房具': '#FFCA28',
    '生花・園芸': '#81C784',
    'その他': '#BDBDBD',
};

// カテゴリ別絵文字アイコン
const CATEGORY_ICONS = {
    '飲食店': '🍽️',
    '住まい': '🏠',
    '家具・寝具・家電': '📺',
    '教育・文化': '📚',
    '広告・印刷・写真': '📷',
    'テイクアウト専門店': '🥡',
    '健康・医療・薬局': '💊',
    '食品・飲料': '🛒',
    'ホームセンター 日用品・リサイクル': '🔧',
    '自動車・バイク・自転車・修理工場': '🚗',
    'ガソリン・石油・プロパン': '⛽',
    '生活・趣味・書店・冠婚葬祭': '📖',
    '衣料・靴・カバン': '👗',
    '時計・宝石・貴金属・眼鏡': '💎',
    '理容・美容・エステ・ビューティー': '💇',
    'クリーニング・補修・レンタル': '👔',
    '菓子・贈答': '🍰',
    '宿泊・温泉': '🏨',
    'タクシー・旅行・観光': '🚕',
    'カラオケ・ボウリング': '🎤',
    '百貨店 コンビニ・スーパー': '🏬',
    '雑貨・アート・文房具': '🎨',
    '生花・園芸': '🌸',
    'その他': '🏷️',
};

// 地図の初期化（佐賀駅付近を中心に）
const map = L.map('map').setView([33.2635, 130.3009], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 現在地取得コントロールの追加
const LocateControl = L.Control.extend({
    options: {
        position: 'topleft'
    },
    onAdd: function (map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-locate');
        const button = L.DomUtil.create('a', '', container);
        button.innerHTML = '📍';
        button.href = '#';
        button.title = '現在地を表示';

        L.DomEvent.on(button, 'click', function (e) {
            L.DomEvent.preventDefault(e);
            button.classList.add('requesting');
            map.locate({ setView: true, maxZoom: 16 });
        });

        return container;
    }
});
map.addControl(new LocateControl());

let userLocationMarker = null;

map.on('locationfound', function (e) {
    const locateButton = document.querySelector('.leaflet-control-locate a');
    if (locateButton) locateButton.classList.remove('requesting');

    if (userLocationMarker) {
        userLocationMarker.setLatLng(e.latlng);
    } else {
        // 現在地を示す青いドットマーカー
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        userLocationMarker = L.marker(e.latlng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        userLocationMarker.bindPopup("現在地周辺").openPopup();
    }
});

map.on('locationerror', function (e) {
    const locateButton = document.querySelector('.leaflet-control-locate a');
    if (locateButton) locateButton.classList.remove('requesting');
    alert(e.message || "現在地を取得できませんでした。ブラウザの位置情報設定をご確認ください。");
});

// マーカークラスタグループ
const markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
});
map.addLayer(markerClusterGroup);

// 店舗データ
let allShops = [];
let currentMarkers = [];

// カテゴリ別のカスタムアイコンを作成
function createMarkerIcon(category) {
    const color = CATEGORY_COLORS[category] || '#888';
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        "><span style="
            transform: rotate(45deg);
            font-size: 12px;
            line-height: 1;
        ">${CATEGORY_ICONS[category] || '📍'}</span></div>`,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36],
    });
}

// 店舗データの読み込み
fetch('data/shops.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(shops => {
        allShops = shops;
        populateCategoryFilter(shops);
        populateAreaFilter(shops);
        renderMap();
        updateShopCount(shops.length, shops.length);
    })
    .catch(error => {
        console.error('データの読み込みに失敗:', error);
        const listContainer = document.getElementById('shop-list');
        if (listContainer) {
            listContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>データの読み込みに失敗しました。<br>ページを再読み込みしてください。</p></div>';
        }
    });

// カテゴリフィルタのドロップダウンを生成
function populateCategoryFilter(shops) {
    const categorySelect = document.getElementById('filter-category');
    const categories = [...new Set(shops.map(s => s.category).filter(Boolean))];
    categories.sort();

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        const icon = CATEGORY_ICONS[cat] || '📍';
        option.textContent = `${icon} ${cat}`;
        categorySelect.appendChild(option);
    });
}

// エリアフィルタのドロップダウンを生成
function populateAreaFilter(shops) {
    const areaSelect = document.getElementById('filter-area');
    const areas = [...new Set(shops.map(s => s.area).filter(Boolean))];

    // エリアの表示順序を定義
    const areaOrder = [
        '中心市街地', '佐賀北部', '佐賀東部', '佐賀南部', '佐賀西部',
        '大和', '富士', '三瀬', '諸富', '川副', '東与賀', '久保田'
    ];
    areas.sort((a, b) => {
        const ia = areaOrder.indexOf(a);
        const ib = areaOrder.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = `📍 ${area}`;
        areaSelect.appendChild(option);
    });
}

// フィルタ適用
function getFilteredShops() {
    const text = document.getElementById('filter-text').value.toLowerCase().trim();
    const category = document.getElementById('filter-category').value;
    const area = document.getElementById('filter-area').value;

    return allShops.filter(shop => {
        // テキストフィルタ
        if (text && !shop.name.toLowerCase().includes(text)) {
            return false;
        }
        // カテゴリフィルタ
        if (category && shop.category !== category) {
            return false;
        }
        // エリアフィルタ
        if (area && shop.area !== area) {
            return false;
        }
        return true;
    });
}

// 地図にマーカーを表示
function renderMap() {
    markerClusterGroup.clearLayers();
    currentMarkers = [];

    const filtered = getFilteredShops();

    filtered.forEach(shop => {
        if (!shop.lat || !shop.lng) return;

        const icon = createMarkerIcon(shop.category);
        const marker = L.marker([shop.lat, shop.lng], { icon });

        const popupContent = `
            <div class="shop-popup-content">
                <div class="popup-name">${escapeHtml(shop.name)}</div>
                <span class="popup-category">${CATEGORY_ICONS[shop.category] || '📍'} ${escapeHtml(shop.category || '')}</span>
                <div class="popup-area">📍 ${escapeHtml(shop.area || '')}</div>
                <a class="popup-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' 佐賀市')}" target="_blank" rel="noopener noreferrer">
                    🗺️ Google Mapで見る
                </a>
            </div>
        `;
        marker.bindPopup(popupContent, { className: 'shop-popup' });
        markerClusterGroup.addLayer(marker);
        currentMarkers.push(marker);
    });

    updateShopCount(filtered.length, allShops.length);
}

// リスト表示
function renderList() {
    const container = document.getElementById('shop-list');
    const filtered = getFilteredShops();

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>条件に一致する店舗が見つかりません。<br>フィルタ条件を変更してください。</p></div>';
        updateShopCount(0, allShops.length);
        return;
    }

    let html = '';
    filtered.forEach(shop => {
        const icon = CATEGORY_ICONS[shop.category] || '📍';
        const color = CATEGORY_COLORS[shop.category] || '#888';
        const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' 佐賀市')}`;

        html += `
            <div class="shop-card" onclick="showShopModal(${allShops.indexOf(shop)})">
                <div class="shop-name">${icon} ${escapeHtml(shop.name)}</div>
                <span class="shop-category-badge" style="background: ${color}">${escapeHtml(shop.category || '')}</span>
                <span class="shop-area-badge">📍 ${escapeHtml(shop.area || '')}</span>
                <div class="shop-links">
                    <a class="shop-link" href="${googleMapUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">🗺️ Google Map</a>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updateShopCount(filtered.length, allShops.length);
}

// 店舗詳細モーダル
function showShopModal(index) {
    const shop = allShops[index];
    if (!shop) return;

    const modal = document.getElementById('shop-modal');
    const content = document.getElementById('shop-modal-content');
    const icon = CATEGORY_ICONS[shop.category] || '📍';
    const color = CATEGORY_COLORS[shop.category] || '#888';
    const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' 佐賀市')}`;

    content.innerHTML = `
        <div class="modal-header">
            <h2>${icon} ${escapeHtml(shop.name)}</h2>
            <button class="modal-close" onclick="closeShopModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="info-item">
                <strong>カテゴリ</strong>
                <span class="shop-category-badge" style="background: ${color}">${escapeHtml(shop.category || '未分類')}</span>
            </div>
            <div class="info-item">
                <strong>エリア</strong>
                <p>📍 ${escapeHtml(shop.area || '不明')}</p>
            </div>
            <div class="info-item">
                <a class="link-button" href="${googleMapUrl}" target="_blank" rel="noopener noreferrer">
                    🗺️ Google Mapで場所を確認
                </a>
            </div>
        </div>
    `;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeShopModal() {
    document.getElementById('shop-modal').style.display = 'none';
    document.body.style.overflow = '';
}

// 表示切替
function switchToMapView() {
    document.getElementById('map').classList.add('active');
    document.getElementById('list-view').classList.remove('active');
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === 'map');
    });
    setTimeout(() => map.invalidateSize(), 100);
}

function switchToListView() {
    document.getElementById('map').classList.remove('active');
    document.getElementById('list-view').classList.add('active');
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === 'list');
    });
    renderList();
}

// 店舗数を更新
function updateShopCount(displayed, total) {
    document.getElementById('displayed-count').textContent = displayed;
    document.getElementById('total-count').textContent = total;
}

// HTML エスケープ
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

// 情報モーダル
function showInfoModal(title, content) {
    document.getElementById('info-modal-title').textContent = title;
    document.getElementById('info-modal-body').innerHTML = content;
    document.getElementById('info-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeInfoModal() {
    document.getElementById('info-modal').style.display = 'none';
    document.body.style.overflow = '';
}

// ===== イベントリスナー =====

// フィルタイベント
document.getElementById('filter-text').addEventListener('input', () => {
    renderMap();
    if (document.getElementById('list-view').classList.contains('active')) {
        renderList();
    }
});

document.getElementById('filter-category').addEventListener('change', () => {
    renderMap();
    if (document.getElementById('list-view').classList.contains('active')) {
        renderList();
    }
});

document.getElementById('filter-area').addEventListener('change', () => {
    renderMap();
    if (document.getElementById('list-view').classList.contains('active')) {
        renderList();
    }
});

// フィルタリセット
document.getElementById('reset-filters').addEventListener('click', () => {
    document.getElementById('filter-text').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-area').value = '';
    renderMap();
    if (document.getElementById('list-view').classList.contains('active')) {
        renderList();
    }
});

// タブ切替
document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        if (tab.dataset.view === 'map') {
            switchToMapView();
        } else if (tab.dataset.view === 'list') {
            switchToListView();
        }
    });
});

// メニュートグル
const menuToggle = document.getElementById('menu-toggle');
const headerNav = document.getElementById('header-nav');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    headerNav.classList.toggle('active');
});

// このサイトについて
document.getElementById('about-link').addEventListener('click', (e) => {
    e.preventDefault();
    headerNav.classList.remove('active');
    menuToggle.classList.remove('active');
    showInfoModal('このサイトについて', `
        <div class="info-item">
            <p>このサイトは、佐賀市が発行する「がばいサカえーるPay [第4弾]」の対象店舗を地図上で検索できる<strong>非公式</strong>のWebアプリです。</p>
        </div>
        <div class="info-item">
            <strong>データについて</strong>
            <p>店舗データは<a href="https://gabai-sakayell.city.saga.lg.jp/Images/gabai20260227.pdf" target="_blank" rel="noopener noreferrer">公式PDF（令和8年2月27日時点）</a>をもとに作成しています。</p>
            <p>最新の情報は<a href="https://gabai-sakayell.city.saga.lg.jp/" target="_blank" rel="noopener noreferrer">公式サイト</a>をご確認ください。</p>
        </div>
        <div class="info-item">
            <strong>免責事項</strong>
            <p>本サイトの情報は正確性を保証するものではありません。実際のご利用の際は、各店舗に直接お問い合わせください。</p>
        </div>
        <div class="info-item">
            <strong>地図上の位置について</strong>
            <p>マーカーの位置はエリア情報をもとに概算で配置しています。正確な店舗の場所は「Google Mapで見る」リンクからご確認ください。</p>
        </div>
    `);
});

// お問い合わせ先
document.getElementById('contact-link').addEventListener('click', (e) => {
    e.preventDefault();
    headerNav.classList.remove('active');
    menuToggle.classList.remove('active');
    showInfoModal('お問い合わせ先', `
        <div class="info-item">
            <p>本サイトについてのお問い合わせ、不具合の報告などは以下のX（旧Twitter）アカウントまでお願いいたします。</p>
            <p style="color: #d32f2f; font-weight: bold; font-size: 0.9em; margin-top: 10px;">※ 本サイトは非公式のアプリです。がばいサカえーるPay事務局や佐賀市などの関係各所へ、本サイトに関するお問い合わせは固くご遠慮ください。</p>
        </div>
        <div class="info-item">
            <strong>開発者（midnight480）のXアカウント</strong>
            <br>
            <a class="link-button" href="https://x.com/midnight480" target="_blank" rel="noopener noreferrer" style="background: #e1f5fe; color: #0288d1;">
                🐦 X（Twitter）はこちら
            </a>
        </div>
    `);
});

// モーダルの外側クリックで閉じる
document.getElementById('shop-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('shop-modal')) {
        closeShopModal();
    }
});

document.getElementById('info-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('info-modal')) {
        closeInfoModal();
    }
});

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeShopModal();
        closeInfoModal();
    }
});

// グローバルに関数を公開
window.closeShopModal = closeShopModal;
window.closeInfoModal = closeInfoModal;
window.showShopModal = showShopModal;
