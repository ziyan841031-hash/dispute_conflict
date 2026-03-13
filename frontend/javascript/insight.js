// 区域洞察地图相关函数

const DISTRICT_RISK_COLOR_MAP = {
    R0: '#00ff85',
    R1: '#a3ff12',
    R2: '#ffe600',
    R3: '#ff9f1a',
    R4: '#ff3b30',
    R5: '#ff0055'
};

function resolveFeatureCenter(feature) {
    const props = feature && feature.properties ? feature.properties : {};
    const preferred = props.centroid || props.center;
    if (Array.isArray(preferred) && preferred.length >= 2) {
        return [Number(preferred[0]), Number(preferred[1])];
    }
    const bounds = resolveFeatureBounds(feature);
    if (!Array.isArray(bounds) || bounds.length < 4) {
        return null;
    }
    return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
}

function resolveFeatureBounds(feature) {
    const geometry = feature && feature.geometry ? feature.geometry : {};
    const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    const walk = (coord) => {
        if (!Array.isArray(coord)) {
            return;
        }
        if (coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
            const lng = coord[0];
            const lat = coord[1];
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            return;
        }
        coord.forEach(walk);
    };

    walk(coordinates);
    if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
        return null;
    }
    return [minLng, minLat, maxLng, maxLat];
}

function getDominantDistrictName(items) {
    const counts = {};
    (Array.isArray(items) ? items : []).forEach((item) => {
        const district = String((item && item.district) || '').trim();
        if (!district) {
            return;
        }
        counts[district] = Number(counts[district] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || '';
}

function getInsightMapView(hasStreetFocus, focusFeature, fallbackCenter, fallbackZoom) {
    const safeCenter = Array.isArray(fallbackCenter) && fallbackCenter.length >= 2 ? fallbackCenter : [121.47, 31.23];
    const view = {
        center: safeCenter,
        zoom: fallbackZoom,
        minZoom: 7,
        maxZoom: 18,
        pitch: hasStreetFocus ? 12 : 0,
        bearing: 0,
        style: 'light'
    };
    if (!hasStreetFocus || !focusFeature) {
        return view;
    }
    const center = resolveFeatureCenter(focusFeature);
    if (Array.isArray(center) && center.length >= 2) {
        view.center = [Number(center[0]), Number(center[1])];
        view.zoom = Math.max(fallbackZoom, 11.15);
        view.minZoom = 9.5;
    }
    return view;
}

function escapeInsightTooltip(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function buildInsightHoverHtml(feature, mode = 'district') {
    const f = feature && feature.properties ? feature.properties : feature;
    if (!f) {
        return '';
    }
    const name = escapeInsightTooltip(f.street_name || f.name || '-');
    const value = escapeInsightTooltip(f.value || 0);
    const risk = escapeInsightTooltip(f.risk_rating || 'R0');
    const reason = escapeInsightTooltip(f.risk_reason || '');
    const brief = escapeInsightTooltip(f.assess_brief || '');
    const display = escapeInsightTooltip(f.dimension_display || '');
    const title = mode === 'street' ? '街道信息' : '区域信息';
    return [
        '<div style="min-width:220px;max-width:320px;padding:10px 12px;border-radius:14px;background:rgba(15,23,42,0.92);border:1px solid rgba(148,163,184,0.28);box-shadow:0 10px 30px rgba(15,23,42,0.22);color:#e2e8f0;backdrop-filter:blur(10px);">',
        '<div style="font-size:12px;color:#93c5fd;margin-bottom:6px;">' + title + '</div>',
        '<div style="font-size:16px;font-weight:700;color:#f8fafc;line-height:1.4;">' + name + '</div>',
        '<div style="margin-top:8px;font-size:13px;line-height:1.7;color:#cbd5e1;">案件数量：<span style="color:#f8fafc;font-weight:600;">' + value + '</span></div>',
        '<div style="font-size:13px;line-height:1.7;color:#cbd5e1;">风险等级：<span style="color:#f8fafc;font-weight:600;">' + risk + '</span></div>',
        reason ? '<div style="margin-top:6px;font-size:12px;line-height:1.6;color:#cbd5e1;">风险原因：' + reason + '</div>' : '',
        brief ? '<div style="margin-top:4px;font-size:12px;line-height:1.6;color:#cbd5e1;">简要结论：' + brief + '</div>' : '',
        display ? '<div style="margin-top:4px;font-size:12px;line-height:1.6;color:#cbd5e1;">' + display + '</div>' : '',
        '</div>'
    ].join('');
}

function ensureInsightTooltip(dom) {
    if (!dom) {
        return null;
    }
    let tooltip = dom.querySelector('.insight-map-tooltip');
    if (tooltip) {
        return tooltip;
    }
    dom.style.position = dom.style.position || 'relative';
    tooltip = document.createElement('div');
    tooltip.className = 'insight-map-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.left = '0';
    tooltip.style.top = '0';
    tooltip.style.zIndex = '12';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.transform = 'translate(-9999px, -9999px)';
    tooltip.style.transition = 'opacity 0.16s ease';
    tooltip.style.opacity = '0';
    dom.appendChild(tooltip);
    return tooltip;
}

function showInsightTooltip(dom, evt, html) {
    const tooltip = ensureInsightTooltip(dom);
    if (!tooltip) {
        return;
    }
    const hostRect = dom.getBoundingClientRect();
    const x = Number(evt && (evt.x !== undefined ? evt.x : evt.offsetX)) || 0;
    const y = Number(evt && (evt.y !== undefined ? evt.y : evt.offsetY)) || 0;
    tooltip.innerHTML = html || '';
    tooltip.style.opacity = html ? '1' : '0';
    const left = Math.max(12, Math.min(hostRect.width - 260, x + 16));
    const top = Math.max(12, Math.min(hostRect.height - 140, y + 16));
    tooltip.style.transform = 'translate(' + left + 'px, ' + top + 'px)';
}

function hideInsightTooltip(dom) {
    const tooltip = dom ? dom.querySelector('.insight-map-tooltip') : null;
    if (!tooltip) {
        return;
    }
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translate(-9999px, -9999px)';
}

let shStreetFeatureCache = null;
const SH_DISTRICT_CODES = [
    '310101', '310104', '310105', '310106', '310107', '310109', '310110', '310112',
    '310113', '310114', '310115', '310116', '310117', '310118', '310120', '310151'
];

const SH_STREET_DISTRICT_GROUPS = {};

const SH_STREET_FALLBACK_OVERRIDES = {
    '张庙街道': {district: '宝山区', lng: 121.4462, lat: 31.3496},
    '吴淞街道': {district: '宝山区', lng: 121.4924, lat: 31.4057},
    '友谊路街道': {district: '宝山区', lng: 121.4878, lat: 31.4031},
    '杨行镇': {district: '宝山区', lng: 121.3746, lat: 31.3428},
    '庙行镇': {district: '宝山区', lng: 121.4278, lat: 31.3201},
    '徐家汇街道': {district: '徐汇区', lng: 121.4374, lat: 31.1887},
    '漕河泾街道': {district: '徐汇区', lng: 121.4302, lat: 31.1705},
    '宜川路街道': {district: '普陀区', lng: 121.4378, lat: 31.2598},
    '岳阳街道': {district: '松江区', lng: 121.2281, lat: 31.0324},
    '嘉定镇街道': {district: '嘉定区', lng: 121.2659, lat: 31.3839},
    '欧阳路街道': {district: '虹口区', lng: 121.4901, lat: 31.2712},
    '徐泾镇': {district: '青浦区', lng: 121.2886, lat: 31.1961},
    '七宝镇': {district: '闵行区', lng: 121.3491, lat: 31.1610},
    '张江镇': {district: '浦东新区', lng: 121.5968, lat: 31.2077},
    '南码头路街道': {district: '浦东新区', lng: 121.5016, lat: 31.1907},
    '南汇新城镇': {district: '浦东新区', lng: 121.9290, lat: 30.9042},
    '祝桥镇': {district: '浦东新区', lng: 121.8053, lat: 31.1606},
    '上钢新村街道': {district: '浦东新区', lng: 121.4895, lat: 31.1714},
    '老港镇': {district: '浦东新区', lng: 121.8562, lat: 30.9528},
    '安亭镇': {district: '嘉定区', lng: 121.1564, lat: 31.2906},
    '赵巷镇': {district: '青浦区', lng: 121.1848, lat: 31.1517},
    '奉城镇': {district: '奉贤区', lng: 121.6622, lat: 30.9180},
    '城桥镇': {district: '崇明区', lng: 121.3975, lat: 31.6262}
};

const SH_DISTRICT_NAME_LIST = [
    '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区',
    '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'
];

function createStreetFallbackMap() {
    return {...SH_STREET_FALLBACK_OVERRIDES};
}

const SH_STREET_FALLBACK_MAP = createStreetFallbackMap();

function getStreetFallbackRecord(name) {
    const normalized = normalizeStreetLabel(name);
    const entries = Object.keys(SH_STREET_FALLBACK_MAP);
    for (let i = 0; i < entries.length; i += 1) {
        const key = entries[i];
        if (normalizeStreetLabel(key) === normalized) {
            return SH_STREET_FALLBACK_MAP[key];
        }
    }
    return null;
}

function inferDistrictFromText(text) {
    const safe = String(text || '');
    for (let i = 0; i < SH_DISTRICT_NAME_LIST.length; i += 1) {
        const district = SH_DISTRICT_NAME_LIST[i];
        if (safe.indexOf(district) >= 0) {
            return district;
        }
    }
    return '';
}

function toFiniteNumber(...values) {
    for (let i = 0; i < values.length; i += 1) {
        const raw = values[i];
        if (raw === null || raw === undefined || raw === '') {
            continue;
        }
        const n = Number(raw);
        if (Number.isFinite(n)) {
            return n;
        }
    }
    return null;
}

function stableNameOffset(text, seed = 0) {
    const raw = String(text || '');
    let hash = seed * 131;
    for (let i = 0; i < raw.length; i += 1) {
        hash = (hash * 131 + raw.charCodeAt(i)) % 104729;
    }
    return ((hash % 1000) / 1000 - 0.5) * 0.18;
}

function buildAnimatedAnchor(lng, lat, name, scale = 1) {
    const baseLng = Number(lng);
    const baseLat = Number(lat);
    const safeScale = Number.isFinite(Number(scale)) ? Number(scale) : 1;
    const offsetLng = stableNameOffset(`${name}:lng`, 17) * 0.085 * safeScale;
    const offsetLat = stableNameOffset(`${name}:lat`, 31) * 0.06 * safeScale;
    return {
        label_lng: baseLng,
        label_lat: baseLat,
        bubble_lng: baseLng + offsetLng,
        bubble_lat: baseLat + offsetLat
    };
}

function normalizeStreetLabel(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, '')
        .replace(/^[*\uFF0A]+/, '')
        .replace(/\uFF08/g, '(')
        .replace(/\uFF09/g, ')');
}

function buildStreetInsightPointData(streetItems, districtFeatures, streetFeatures = []) {
    const items = Array.isArray(streetItems) ? streetItems : [];
    if (!items.length) {
        return [];
    }
    const districtCenterMap = {};
    const districtBoundsMap = {};
    (Array.isArray(districtFeatures) ? districtFeatures : []).forEach((f) => {
        const props = f && f.properties ? f.properties : {};
        const name = String(props.name || '').trim();
        const center = resolveFeatureCenter(f);
        const bounds = resolveFeatureBounds(f);
        if (name && Array.isArray(center) && center.length >= 2) {
            districtCenterMap[name] = [Number(center[0]), Number(center[1])];
        }
        if (name && Array.isArray(bounds) && bounds.length >= 4) {
            districtBoundsMap[name] = bounds.map((value) => Number(value));
        }
    });

    const streetCenterMap = new Map();
    (Array.isArray(streetFeatures) ? streetFeatures : []).forEach((f) => {
        const props = f && f.properties ? f.properties : {};
        const streetName = String(props.street_name || props.name || '').trim();
        const center = resolveFeatureCenter(f);
        if (!streetName || !Array.isArray(center) || center.length < 2) {
            return;
        }
        const normalizedStreetName = normalizeStreetLabel(streetName);
        if (!streetCenterMap.has(normalizedStreetName)) {
            streetCenterMap.set(normalizedStreetName, [Number(center[0]), Number(center[1])]);
        }
    });

    const merged = new Map();
    items.forEach((item) => {
        const fallback = getStreetFallbackRecord(item && (item.street || item.street_name || item.street_town || item.streetTown || item.town || item.subdistrict));
        const district = String((item && (item.district || item.district_name || item.region || item.region_name || (fallback && fallback.district))) || '').trim();
        const streetName = String((item && (item.street || item.street_name || item.street_town || item.streetTown || item.town || item.subdistrict)) || '').trim();
        if (!streetName) {
            return;
        }
        const value = Math.max(1, Number((item && (item.metric_value || item.case_count || item.value || item.count)) || 0));
        const riskRating = String((item && item.risk_rating) || 'R0').toUpperCase();
        const coords = Array.isArray(item && item.center) ? item.center : (Array.isArray(item && item.centroid) ? item.centroid : null);
        const lng = toFiniteNumber(
            item && item.lng,
            item && item.lon,
            item && item.longitude,
            item && item.centerLng,
            item && item.center_lng,
            coords && coords[0],
            fallback && fallback.lng
        );
        const lat = toFiniteNumber(
            item && item.lat,
            item && item.latitude,
            item && item.centerLat,
            item && item.center_lat,
            coords && coords[1],
            fallback && fallback.lat
        );
        const key = district + '|' + streetName;
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, {
                district,
                street_name: streetName,
                value,
                risk_rating: riskRating,
                risk_reason: String((item && item.risk_reason) || ''),
                assess_brief: String((item && item.assess_brief) || ''),
                dimension_display: String((item && item.dimension_display) || ''),
                lng,
                lat
            });
            return;
        }
        existing.value += value;
        existing.risk_rating = riskRating;
        existing.risk_reason = String((item && item.risk_reason) || existing.risk_reason || '');
        existing.assess_brief = String((item && item.assess_brief) || existing.assess_brief || '');
        existing.dimension_display = String((item && item.dimension_display) || existing.dimension_display || '');
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            existing.lng = lng;
            existing.lat = lat;
        }
    });

    return Array.from(merged.values()).map((row) => {
        let lng = toFiniteNumber(row.lng);
        let lat = toFiniteNumber(row.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            const streetBase = streetCenterMap.get(normalizeStreetLabel(row.street_name));
            if (Array.isArray(streetBase) && streetBase.length >= 2) {
                lng = Number(streetBase[0]);
                lat = Number(streetBase[1]);
            }
        }
        if ((!Number.isFinite(lng) || !Number.isFinite(lat)) && districtBoundsMap[row.district]) {
            const bounds = districtBoundsMap[row.district];
            const minLng = Number(bounds[0]);
            const minLat = Number(bounds[1]);
            const maxLng = Number(bounds[2]);
            const maxLat = Number(bounds[3]);
            const width = Math.max(0.018, maxLng - minLng);
            const height = Math.max(0.014, maxLat - minLat);
            const normalizedLngSeed = ((stableNameOffset(row.street_name + ':' + row.district, 41) / 0.18) + 0.5);
            const normalizedLatSeed = ((stableNameOffset(row.street_name + ':' + row.district, 59) / 0.18) + 0.5);
            lng = minLng + width * (0.18 + normalizedLngSeed * 0.64);
            lat = minLat + height * (0.18 + normalizedLatSeed * 0.64);
        }
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            const base = districtCenterMap[row.district];
            if (Array.isArray(base) && base.length >= 2) {
                lng = Number(base[0]) + stableNameOffset(row.street_name + ':' + row.district, 7) * 0.55;
                lat = Number(base[1]) + stableNameOffset(row.street_name + ':' + row.district, 13) * 0.38;
            }
        }
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            lng = 121.47 + stableNameOffset(row.street_name || row.district || '', 19) * 2.4;
            lat = 31.23 + stableNameOffset(row.street_name || row.district || '', 23) * 1.6;
        }
        return {
            ...row,
            lng,
            lat,
            ...buildAnimatedAnchor(lng, lat, row.street_name + ':' + row.district, 0.18)
        };
    }).filter(Boolean);
}

async function loadShanghaiStreetFeatures() {
    if (!Array.isArray(shStreetFeatureCache)) {
        shStreetFeatureCache = [];
    }
    return shStreetFeatureCache;
}

async function loadDistrictInsight() {
    const mapEl = document.getElementById('shMapChart');
    if (!mapEl) return;
    districtInsightData = {};
    districtInsightRatedMap = {};
    districtInsightStreetItems = [];
    await renderShanghaiMap({}, districtInsightRatedMap, districtInsightStreetItems);
    drawDistrictBarChart({});
    drawDistrictPieChart({});
    ensureInsightEmptyState(document.getElementById('insightChatLog'));
    await triggerDefaultDistrictInsightQuestion();
}

async function loadDistrictInsightBubble() {
    const mapEl = document.getElementById('shBubbleMapChart');
    if (!mapEl) return;
    districtInsightData = {};
    districtInsightRatedMap = {};
    districtInsightStreetItems = [];
    await renderShanghaiBubbleMap({}, districtInsightRatedMap, districtInsightStreetItems);
    ensureInsightEmptyState(document.getElementById('insightChatLog'));
    await triggerDefaultDistrictInsightQuestion();
}

async function renderShanghaiBubbleMap(data, ratedMap = {}, streetItems = []) {
    const dom = document.getElementById('shBubbleMapChart');
    if (!dom) {
        return;
    }

    const hasL7 = typeof L7 !== 'undefined';
    const hasL7Maps = typeof L7Maps !== 'undefined';
    const MapCtor = hasL7Maps
        ? (L7Maps.Map || L7Maps.GaodeMap || L7Maps.Mapbox || L7Maps.MapboxMap)
        : (hasL7 ? (L7.Map || L7.GaodeMap || L7.Mapbox || L7.MapboxMap) : null);

    if (!hasL7 || !MapCtor) {
        dom.innerHTML = '<div style="padding:16px;color:#f8fafc;">L7 地图组件加载失败，请检查网络或 CDN 资源。</div>';
        return;
    }

    if (shBubbleMapScene) {
        try {
            shBubbleMapScene.destroy();
        } catch (e) {
            console.warn('bubble map destroy failed', e);
        }
        shBubbleMapScene = null;
        shBubbleMapLayers = [];
    }
    dom.innerHTML = '';
    hideInsightTooltip(dom);

    const geoRes = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/310000_full.json');
    const geo = await geoRes.json();
    const features = Array.isArray(geo && geo.features) ? geo.features : [];
    const districtFeatures = features
        .filter((f) => {
            const p = f && f.properties ? f.properties : {};
            const name = String(p.name || '');
            const level = String(p.level || '');
            return level === 'district' || name.endsWith('区');
        })
        .map((f) => {
            const name = String((f.properties && f.properties.name) || '');
            const value = Number((data || {})[name] || 0);
            const rated = (ratedMap && ratedMap[name]) ? ratedMap[name] : {};
            return {
                ...f,
                properties: {
                    ...(f.properties || {}),
                    name,
                    value,
                    risk_rating: String(rated.risk_rating || 'R0').toUpperCase(),
                    risk_reason: String(rated.risk_reason || ''),
                    assess_brief: String(rated.assess_brief || ''),
                    dimension_display: String(rated.dimension_display || '')
                }
            };
        });

    const streetFeatures = await loadShanghaiStreetFeatures();
    const pointData = districtFeatures.map((f) => {
        const center = resolveFeatureCenter(f);
        if (!Array.isArray(center) || center.length < 2) {
            return null;
        }
        const props = f.properties || {};
        const value = Math.max(1, Number(props.value || 0));
        return {
            lng: Number(center[0]),
            lat: Number(center[1]),
            name: String(props.name || ''),
            value,
            risk_rating: String(props.risk_rating || 'R0').toUpperCase(),
            risk_reason: String(props.risk_reason || ''),
            assess_brief: String(props.assess_brief || ''),
            dimension_display: String(props.dimension_display || ''),
            ...buildAnimatedAnchor(Number(center[0]), Number(center[1]), String(props.name || ''), 0.9)
        };
    }).filter(Boolean);

    const streetInsightPointData = buildStreetInsightPointData(streetItems, districtFeatures, streetFeatures);
    const hasStreetFocus = streetInsightPointData.length > 0;
    const focusDistrictName = hasStreetFocus ? getDominantDistrictName(streetInsightPointData) : '';
    const displayStreetPointData = hasStreetFocus
        ? streetInsightPointData.filter((item) => !focusDistrictName || item.district === focusDistrictName)
        : [];
    const focusDistrictFeature = focusDistrictName
        ? districtFeatures.find((feature) => String((feature.properties && feature.properties.name) || '') === focusDistrictName)
        : null;

    const maxPointValue = pointData.length ? Math.max(...pointData.map((item) => Number(item.value || 0))) : 1;
    const maxStreetPointValue = displayStreetPointData.length ? Math.max(...displayStreetPointData.map((item) => Number(item.value || 0))) : 1;
    const hasOpenMapCtor = typeof L7Maps !== 'undefined' && !!L7Maps.Map;
    const MapCtorForBase = hasOpenMapCtor ? L7Maps.Map : MapCtor;
    const mapOptions = getInsightMapView(hasStreetFocus, focusDistrictFeature, [121.47, 31.23], 9.2);
    const baseTileUrl = 'https://rt0.map.gtimg.com/realtimerender?z={z}&x={x}&y={-y}&type=vector&style=0';
    const detailTileUrl = 'https://rt0.map.gtimg.com/tile?z={z}&x={x}&y={-y}&styleid=2&scene=0&version=347';
    const borderColor = '#60a5fa';
    const districtLabelColor = '#64748b';
    const streetLabelColor = '#64748b';
    const pulseColor = '#22d3ee';
    const streetPulseColor = '#38bdf8';
    const bubbleStrokeColor = '#ffffff';
    const baseRasterOpacity = 1;
    const detailRasterOpacity = 0.34;

    const scene = new L7.Scene({
        id: 'shBubbleMapChart',
        map: new MapCtorForBase(mapOptions)
    });

    await new Promise((resolve) => {
        scene.on('loaded', resolve);
    });

    const baseRasterLayer = new L7.RasterLayer({autoFit: false})
        .source(baseTileUrl, {
            parser: {type: 'rasterTile', tileSize: 256}
        })
        .style({opacity: baseRasterOpacity});

    const detailRasterLayer = new L7.RasterLayer({autoFit: false})
        .source(detailTileUrl, {
            parser: {type: 'rasterTile', tileSize: 256}
        })
        .style({opacity: detailRasterOpacity});

    const polygonLayer = new L7.PolygonLayer({autoFit: false})
        .source({type: 'FeatureCollection', features: districtFeatures})
        .shape('fill')
        .color('value', ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa'])
        .style({
            opacity: 0,
            raisingHeight: hasStreetFocus ? 0.4 : 1.4,
            heightfixed: true
        });

    const borderLayer = new L7.LineLayer({autoFit: false})
        .source({type: 'FeatureCollection', features: districtFeatures})
        .shape('line')
        .size(hasStreetFocus ? 1.05 : 0.7)
        .color(borderColor)
        .style({opacity: 0.68});

    const bubbleLayer = new L7.PointLayer({autoFit: false})
        .source(pointData, {
            parser: {type: 'json', x: 'bubble_lng', y: 'bubble_lat'}
        })
        .shape('circle')
        .size('value', (value) => {
            const normalized = maxPointValue > 0 ? Number(value || 0) / maxPointValue : 0;
            return 18 + (normalized * 56);
        })
        .color('risk_rating', ['#15803d', '#65a30d', '#ca8a04', '#ea580c', '#dc2626', '#991b1b'])
        .scale('risk_rating', {type: 'cat', domain: ['R0', 'R1', 'R2', 'R3', 'R4', 'R5']})
        .style({opacity: 0.86, stroke: bubbleStrokeColor, strokeWidth: 1.6})
        .animate(true);

    const pulseLayer = new L7.PointLayer({autoFit: false, blend: 'additive'})
        .source(pointData, {
            parser: {type: 'json', x: 'bubble_lng', y: 'bubble_lat'}
        })
        .shape('circle')
        .size('value', (value) => {
            const normalized = maxPointValue > 0 ? Number(value || 0) / maxPointValue : 0;
            return 28 + (normalized * 84);
        })
        .color(pulseColor)
        .style({opacity: 0.1})
        .animate(true);

    const districtNameLayer = new L7.PointLayer({autoFit: false})
        .source(pointData, {
            parser: {type: 'json', x: 'label_lng', y: 'label_lat'}
        })
        .shape('name', 'text')
        .size(12)
        .color(districtLabelColor)
        .style({textAnchor: 'center', textOffset: [0, 12], strokeWidth: 0, opacity: 0.72});

    const streetInsightLayer = new L7.PointLayer({autoFit: false})
        .source(displayStreetPointData, {
            parser: {type: 'json', x: 'bubble_lng', y: 'bubble_lat'}
        })
        .shape('circle')
        .size('value', (value) => {
            const normalized = maxStreetPointValue > 0 ? Number(value || 0) / maxStreetPointValue : 0;
            return 20 + (normalized * 28);
        })
        .color('risk_rating', ['#15803d', '#65a30d', '#ca8a04', '#ea580c', '#dc2626', '#991b1b'])
        .scale('risk_rating', {type: 'cat', domain: ['R0', 'R1', 'R2', 'R3', 'R4', 'R5']})
        .style({opacity: 0.92, stroke: bubbleStrokeColor, strokeWidth: 1.2})
        .animate(true);

    const streetInsightPulseLayer = new L7.PointLayer({autoFit: false, blend: 'additive'})
        .source(displayStreetPointData, {
            parser: {type: 'json', x: 'bubble_lng', y: 'bubble_lat'}
        })
        .shape('circle')
        .size('value', (value) => {
            const normalized = maxStreetPointValue > 0 ? Number(value || 0) / maxStreetPointValue : 0;
            return 34 + (normalized * 40);
        })
        .color(streetPulseColor)
        .style({opacity: 0.08})
        .animate(true);

    const streetInsightLabelLayer = new L7.PointLayer({autoFit: false})
        .source(displayStreetPointData, {
            parser: {type: 'json', x: 'label_lng', y: 'label_lat'}
        })
        .shape('street_name', 'text')
        .size(12)
        .color(streetLabelColor)
        .style({textAnchor: 'center', textOffset: [0, 14], strokeWidth: 0, textAllowOverlap: false, opacity: 0.74});

    scene.addLayer(baseRasterLayer);
    scene.addLayer(detailRasterLayer);
    scene.addLayer(polygonLayer);
    scene.addLayer(borderLayer);
    scene.addLayer(pulseLayer);
    scene.addLayer(bubbleLayer);
    scene.addLayer(streetInsightPulseLayer);
    scene.addLayer(streetInsightLayer);
    scene.addLayer(districtNameLayer);
    scene.addLayer(streetInsightLabelLayer);

    const showLayer = (layer) => {
        if (layer && typeof layer.show === 'function') {
            layer.show();
        }
    };
    const hideLayer = (layer) => {
        if (layer && typeof layer.hide === 'function') {
            layer.hide();
        }
    };

    const DETAIL_ZOOM = 10.8;
    const applyBubbleMapDetailLevel = (zoomValue) => {
        if (hasStreetFocus) {
            showLayer(baseRasterLayer);
            hideLayer(detailRasterLayer);
            hideLayer(pulseLayer);
            hideLayer(bubbleLayer);
            hideLayer(districtNameLayer);
            showLayer(streetInsightPulseLayer);
            showLayer(streetInsightLayer);
            showLayer(streetInsightLabelLayer);
            return;
        }
        showLayer(baseRasterLayer);
        hideLayer(detailRasterLayer);
        showLayer(pulseLayer);
        showLayer(bubbleLayer);
        showLayer(districtNameLayer);
        hideLayer(streetInsightPulseLayer);
        hideLayer(streetInsightLayer);
        hideLayer(streetInsightLabelLayer);
        showLayer(districtNameLayer);
        hideLayer(streetInsightPulseLayer);
        hideLayer(streetInsightLayer);
        hideLayer(streetInsightLabelLayer);
    };

    const getCurrentZoom = () => {
        try {
            if (scene && typeof scene.getZoom === 'function') {
                return scene.getZoom();
            }
        } catch (e) {}
        return mapOptions.zoom;
    };

    applyBubbleMapDetailLevel(getCurrentZoom());
    scene.on('zoomchange', () => {
        applyBubbleMapDetailLevel(getCurrentZoom());
    });

    const bindHoverTooltip = (layer, mode) => {
        if (!layer || typeof layer.on !== 'function') {
            return;
        }
        layer.on('mousemove', (e) => {
            const feature = e && e.feature ? e.feature : null;
            showInsightTooltip(dom, e, buildInsightHoverHtml(feature, mode));
        });
        layer.on('mouseout', () => hideInsightTooltip(dom));
    };

    dom.onmouseleave = () => hideInsightTooltip(dom);
    if (hasStreetFocus) {
        bindHoverTooltip(streetInsightLayer, 'street');
    } else {
        bindHoverTooltip(bubbleLayer, 'district');
        bindHoverTooltip(polygonLayer, 'district');
    }

    shBubbleMapScene = scene;
    shBubbleMapLayers = [baseRasterLayer, detailRasterLayer, polygonLayer, borderLayer, pulseLayer, bubbleLayer, streetInsightPulseLayer, districtNameLayer, streetInsightLayer, streetInsightLabelLayer];
}

async function renderShanghaiMap(data, ratedMap = {}, streetItems = []) {
    const dom = document.getElementById('shMapChart');
    if (!dom) {
        return;
    }
    const hasL7 = typeof L7 !== 'undefined';
    const hasL7Maps = typeof L7Maps !== 'undefined';
    const MapCtor = hasL7Maps
        ? (L7Maps.Map || L7Maps.GaodeMap || L7Maps.Mapbox || L7Maps.MapboxMap)
        : (hasL7 ? (L7.Map || L7.GaodeMap || L7.Mapbox || L7.MapboxMap) : null);

    if (!hasL7 || !MapCtor) {
        dom.innerHTML = '<div style="padding:16px;color:#f8fafc;">L7 地图组件加载失败，请检查网络或 CDN 资源。</div>';
        console.error('L7 load failed', {hasL7, hasL7Maps, l7Keys: hasL7 ? Object.keys(L7) : []});
        return;
    }

    if (shMapScene) {
        try {
            shMapScene.destroy();
        } catch (e) {
            console.warn('旧地图销毁失败', e);
        }
        shMapScene = null;
        shMapLayers = [];
    }
    dom.innerHTML = '';
    hideInsightTooltip(dom);

    const geoRes = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/310000_full.json');
    const geo = await geoRes.json();
    const features = Array.isArray(geo && geo.features) ? geo.features : [];
    const districtFeatures = features.filter((f) => {
        const p = f && f.properties ? f.properties : {};
        const name = String(p.name || '');
        const level = String(p.level || '');
        return level === 'district' || name.endsWith('区');
    }).map((f) => {
        const name = String((f.properties && f.properties.name) || '');
        const value = Number((data || {})[name] || 0);
        const rated = (ratedMap && ratedMap[name]) ? ratedMap[name] : {};
        return {
            ...f,
            properties: {
                ...(f.properties || {}),
                name,
                value,
                risk_rating: String(rated.risk_rating || 'R0').toUpperCase(),
                risk_reason: String(rated.risk_reason || ''),
                assess_brief: String(rated.assess_brief || ''),
                dimension_display: String(rated.dimension_display || '')
            }
        };
    });

    const streetFeatures = await loadShanghaiStreetFeatures();
    const pointData = districtFeatures.map((f) => {
        const center = resolveFeatureCenter(f);
        if (!Array.isArray(center) || center.length < 2) {
            return null;
        }
        const props = f.properties || {};
        return {
            lng: Number(center[0]),
            lat: Number(center[1]),
            name: String(props.name || ''),
            value: Math.max(1, Number(props.value || 0)),
            risk_rating: String(props.risk_rating || 'R0').toUpperCase(),
            risk_reason: String(props.risk_reason || ''),
            assess_brief: String(props.assess_brief || ''),
            dimension_display: String(props.dimension_display || ''),
            ...buildAnimatedAnchor(Number(center[0]), Number(center[1]), String(props.name || ''), 0.88)
        };
    }).filter(Boolean);

    const streetInsightPointData = buildStreetInsightPointData(streetItems, districtFeatures, streetFeatures);
    const hasStreetFocus = streetInsightPointData.length > 0;
    const focusDistrictName = hasStreetFocus ? getDominantDistrictName(streetInsightPointData) : '';
    const displayStreetPointData = hasStreetFocus
        ? streetInsightPointData.filter((item) => !focusDistrictName || item.district === focusDistrictName)
        : [];
    const focusDistrictFeature = focusDistrictName
        ? districtFeatures.find((feature) => String((feature.properties && feature.properties.name) || '') === focusDistrictName)
        : null;

    const maxPointValue = pointData.length ? Math.max(...pointData.map((item) => Number(item.value || 0))) : 1;
    const maxStreetPointValue = displayStreetPointData.length ? Math.max(...displayStreetPointData.map((item) => Number(item.value || 0))) : 1;
    const hasOpenMapCtor = typeof L7Maps !== 'undefined' && !!L7Maps.Map;
    const MapCtorForBase = hasOpenMapCtor ? L7Maps.Map : MapCtor;
    const mapOptions = getInsightMapView(hasStreetFocus, focusDistrictFeature, [121.47, 31.23], 9.6);
    mapOptions.pitch = hasStreetFocus ? 8 : 32;
    mapOptions.bearing = hasStreetFocus ? 0 : -5;

    const scene = new L7.Scene({
        id: 'shMapChart',
        map: new MapCtorForBase(mapOptions)
    });

    await new Promise((resolve) => {
        scene.on('loaded', resolve);
    });

    const polygonLayer = new L7.PolygonLayer({autoFit: false})
        .source({type: 'FeatureCollection', features: districtFeatures})
        .shape('fill')
        .color('value', ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa'])
        .style({
            opacity: 0,
            raisingHeight: hasStreetFocus ? 0.8 : 5,
            heightfixed: true
        })
        .active({color: '#67e8f9'});

    const borderLayer = new L7.LineLayer({autoFit: false})
        .source({type: 'FeatureCollection', features: districtFeatures})
        .shape('line')
        .size(hasStreetFocus ? 1.2 : 1.5)
        .color('#60a5fa')
        .style({opacity: 0.64});

    const pillarLayer = new L7.PointLayer({autoFit: false})
        .source(pointData, {
            parser: {type: 'json', x: 'bubble_lng', y: 'bubble_lat'}
        })
        .shape('cylinder')
        .size('value', (value) => {
            const normalized = maxPointValue > 0 ? Number(value || 0) / maxPointValue : 0;
            const height = 16 + (normalized * 72);
            return [7, height];
        })
        .color('risk_rating', ['#15803d', '#65a30d', '#ca8a04', '#ea580c', '#dc2626', '#991b1b'])
        .scale('risk_rating', {type: 'cat', domain: ['R0', 'R1', 'R2', 'R3', 'R4', 'R5']})
        .style({opacity: 1, stroke: '#ffffff', strokeWidth: 0.45})
        .animate(true);

    const lightDotLayer = new L7.PointLayer({autoFit: false, blend: 'additive'})
        .source(pointData, {
            parser: {type: 'json', x: 'bubble_lng', y: 'bubble_lat'}
        })
        .shape('circle')
        .size(6)
        .color('#38bdf8')
        .style({opacity: 0.9});

    const districtNameLayer = new L7.PointLayer({autoFit: false})
        .source(pointData, {
            parser: {type: 'json', x: 'label_lng', y: 'label_lat'}
        })
        .shape('name', 'text')
        .size(12)
        .color('#64748b')
        .style({textAnchor: 'center', textOffset: [0, 12], strokeWidth: 0, opacity: 0.72});

    const streetInsightLayer = new L7.PointLayer({autoFit: false})
        .source(displayStreetPointData, {
            parser: {type: 'json', x: 'bubble_lng', y: 'bubble_lat'}
        })
        .shape('circle')
        .size('value', (value) => {
            const normalized = maxStreetPointValue > 0 ? Number(value || 0) / maxStreetPointValue : 0;
            return 20 + (normalized * 28);
        })
        .color('risk_rating', ['#15803d', '#65a30d', '#ca8a04', '#ea580c', '#dc2626', '#991b1b'])
        .scale('risk_rating', {type: 'cat', domain: ['R0', 'R1', 'R2', 'R3', 'R4', 'R5']})
        .style({opacity: 0.92, stroke: '#ffffff', strokeWidth: 1.1})
        .animate(true);

    const streetInsightPulseLayer = new L7.PointLayer({autoFit: false, blend: 'additive'})
        .source(displayStreetPointData, {
            parser: {type: 'json', x: 'bubble_lng', y: 'bubble_lat'}
        })
        .shape('circle')
        .size('value', (value) => {
            const normalized = maxStreetPointValue > 0 ? Number(value || 0) / maxStreetPointValue : 0;
            return 34 + (normalized * 40);
        })
        .color('#38bdf8')
        .style({opacity: 0.08})
        .animate(true);

    const streetInsightLabelLayer = new L7.PointLayer({autoFit: false})
        .source(displayStreetPointData, {
            parser: {type: 'json', x: 'label_lng', y: 'label_lat'}
        })
        .shape('street_name', 'text')
        .size(12)
        .color('#64748b')
        .style({textAnchor: 'center', textOffset: [0, 14], strokeWidth: 0, textAllowOverlap: false, opacity: 0.74});

    scene.addLayer(polygonLayer);
    scene.addLayer(borderLayer);
    scene.addLayer(pillarLayer);
    scene.addLayer(lightDotLayer);
    scene.addLayer(streetInsightPulseLayer);
    scene.addLayer(streetInsightLayer);
    scene.addLayer(districtNameLayer);
    scene.addLayer(streetInsightLabelLayer);

    if (hasStreetFocus) {
        if (typeof pillarLayer.hide === 'function') pillarLayer.hide();
        if (typeof lightDotLayer.hide === 'function') lightDotLayer.hide();
        if (typeof districtNameLayer.hide === 'function') districtNameLayer.hide();
    } else {
        if (typeof streetInsightPulseLayer.hide === 'function') streetInsightPulseLayer.hide();
        if (typeof streetInsightLayer.hide === 'function') streetInsightLayer.hide();
        if (typeof streetInsightLabelLayer.hide === 'function') streetInsightLabelLayer.hide();
    }

    const bindHoverTooltip = (layer, mode) => {
        if (!layer || typeof layer.on !== 'function') {
            return;
        }
        layer.on('mousemove', (e) => {
            const feature = e && e.feature ? e.feature : null;
            showInsightTooltip(dom, e, buildInsightHoverHtml(feature, mode));
        });
        layer.on('mouseout', () => hideInsightTooltip(dom));
    };

    dom.onmouseleave = () => hideInsightTooltip(dom);
    if (hasStreetFocus) {
        bindHoverTooltip(streetInsightLayer, 'street');
    } else {
        bindHoverTooltip(pillarLayer, 'district');
        bindHoverTooltip(polygonLayer, 'district');
    }

    shMapScene = scene;
    shMapLayers = [polygonLayer, borderLayer, pillarLayer, lightDotLayer, streetInsightPulseLayer, streetInsightLayer, districtNameLayer, streetInsightLabelLayer];
    shMapChart = scene;
}

function drawDistrictBarChart(data) {
    const c = document.getElementById('districtBarCanvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    const entries = Object.entries(data || {}).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const max = entries.length ? Math.max(...entries.map(x=>x[1])) : 1;
    ctx.fillStyle = '#0f172a';
    ctx.font = '14px sans-serif';
    ctx.fillText('区域案件 Top8（柱状图）', 8, 16);
    entries.forEach((e,i)=>{
        const y = 30 + i*22;
        const w = Math.round((e[1]/max)*220);
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(110, y, w, 14);
        ctx.fillStyle = '#334155'; ctx.fillText(e[0], 8, y+12);
        ctx.fillStyle = '#1e293b'; ctx.fillText(String(e[1]), 336, y+12);
    });
}

function drawDistrictPieChart(data) {
    const c = document.getElementById('districtPieCanvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    const entries = Object.entries(data || {}).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const total = entries.reduce((sum,item)=>sum+(Number(item[1])||0),0) || 1;
    const colors = ['#2563eb','#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6'];
    let start = -Math.PI/2;
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('类型占比（饼图）', 8, 16);
    entries.forEach((e,i)=>{
        const ang = (e[1]/total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(110,125);
        ctx.arc(110,125,72,start,start+ang);
        ctx.closePath();
        ctx.fillStyle = colors[i%colors.length];
        ctx.fill();
        const mid = start + ang / 2;
        const lx = 110 + Math.cos(mid) * 90;
        const ly = 125 + Math.sin(mid) * 90;
        ctx.fillStyle = '#1f2937';
        ctx.fillText(e[0], lx, ly);
        start += ang;
    });
}

function renderInsightMarkdown(content) {
    const safe = normalizeInsightMarkdown(content);
    if (window.markdownit && typeof window.markdownit === 'function') {
        const md = window.markdownit({breaks: true, linkify: true, html: false});
        return md.render(safe);
    }
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        return marked.parse(safe, {breaks: true, gfm: true});
    }
    return safe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
}

function normalizeInsightMarkdown(content) {
    const safe = String(content || '').replace(/\r\n/g, '\n');
    const lines = safe.split('\n');
    const normalized = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            return '';
        }
        if (/^\d+\.\S/.test(trimmed)) {
            return trimmed.replace(/^(\d+)\.(\S)/, '$1. $2');
        }
        return line;
    });
    return normalized.join('\n');
}

function pickDistrictInsightItems(data) {
    const directCandidates = [
        data && data.ratedItems,
        data && data.streetItems,
        data && data.items,
        data && data.list,
        data && data.records,
        data && data.resultItems,
        data && data.resultList
    ];
    for (let i = 0; i < directCandidates.length; i += 1) {
        if (Array.isArray(directCandidates[i]) && directCandidates[i].length) {
            return directCandidates[i];
        }
    }
    const nested = data && data.result ? data.result : null;
    if (nested) {
        const nestedCandidates = [nested.ratedItems, nested.streetItems, nested.items, nested.list, nested.records];
        for (let i = 0; i < nestedCandidates.length; i += 1) {
            if (Array.isArray(nestedCandidates[i]) && nestedCandidates[i].length) {
                return nestedCandidates[i];
            }
        }
    }
    return [];
}

function normalizeDistrictInsightItem(item, contextDistrict = '') {
    const safeItem = item || {};
    const streetFallback = getStreetFallbackRecord(safeItem.street || safeItem.street_name || safeItem.street_town || safeItem.streetTown || safeItem.town || safeItem.subdistrict || safeItem.subdistrict_name || safeItem.name || safeItem.label);
    const district = String((safeItem.district || safeItem.district_name || safeItem.region || safeItem.region_name || safeItem.area || safeItem.area_name || (streetFallback && streetFallback.district) || contextDistrict) || '').trim();
    const streetName = String((safeItem.street || safeItem.street_name || safeItem.street_town || safeItem.streetTown || safeItem.town || safeItem.subdistrict || safeItem.subdistrict_name || safeItem.name || safeItem.label) || '').trim();
    const metricValue = Number((safeItem.metric_value || safeItem.case_count || safeItem.value || safeItem.count || safeItem.total) || 0);
    return {
        ...safeItem,
        district,
        street_name: streetName,
        metric_value: metricValue,
        lng: toFiniteNumber(safeItem.lng, safeItem.lon, safeItem.longitude, safeItem.centerLng, safeItem.center_lng, streetFallback && streetFallback.lng),
        lat: toFiniteNumber(safeItem.lat, safeItem.latitude, safeItem.centerLat, safeItem.center_lat, streetFallback && streetFallback.lat)
    };
}

function formatInsightNow() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
}

function ensureInsightCurrentQuestion(question) {
    const node = document.getElementById('insightCurrentQuestion');
    if (node) {
        node.textContent = String(question || '-');
    }
}

function ensureInsightEmptyState(log) {
    if (!log) return;
    if (log.children.length > 0) return;
    const empty = document.createElement('div');
    empty.className = 'insight-chat-empty';
    empty.textContent = '输入问题后，这里会展示逐条生成的洞察结果。';
    log.appendChild(empty);
}

function clearInsightEmptyState(log) {
    if (!log) return;
    const empty = log.querySelector('.insight-chat-empty');
    if (empty) {
        empty.remove();
    }
}

function createInsightChatEntry(log, question) {
    const timeText = formatInsightNow();
    const entry = document.createElement('article');
    entry.className = 'insight-chat-thread';
    entry.innerHTML = [
        '<div class="insight-chat-message insight-chat-message-user">',
        '  <div class="insight-chat-bubble">',

        '    <div class="insight-chat-text"></div>',
        '  </div>',
        '</div>',
        '<div class="insight-chat-message insight-chat-message-ai">',
        '  <div class="insight-chat-bubble">',

        '    <div class="insight-chat-answer insight-chat-streaming"></div>',
        '  </div>',
        '</div>'
    ].join('');
    const times = entry.querySelectorAll('.insight-chat-time');
    times.forEach((node) => {
        node.textContent = timeText;
    });
    entry.querySelector('.insight-chat-text').textContent = String(question || '-');
    clearInsightEmptyState(log);
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
    return entry.querySelector('.insight-chat-answer');
}

function createInsightWaitingAnimation(log, question) {
    const answerNode = createInsightChatEntry(log, question);
    answerNode.textContent = '数据洞察中';
    let dots = 0;
    answerNode._timer = setInterval(() => {
        dots = (dots + 1) % 4;
        answerNode.textContent = '数据洞察中' + '.'.repeat(dots);
    }, 320);
    return answerNode;
}

function stopInsightWaitingAnimation(node) {
    if (!node) return;
    if (node._timer) {
        clearInterval(node._timer);
        node._timer = null;
    }
}

async function renderInsightAnswerLineByLine(node, markdown) {
    const target = node;
    if (!target) {
        return;
    }
    const source = String(markdown || '').trim();
    if (!source) {
        target.innerHTML = renderInsightMarkdown('已完成分析，但未返回可展示的结论。');
        return;
    }
    const lines = source.split(/\r?\n/);
    let buffer = '';
    for (let i = 0; i < lines.length; i += 1) {
        buffer += (i === 0 ? '' : '\n') + lines[i];
        target.innerHTML = renderInsightMarkdown(buffer);
        await new Promise((resolve) => setTimeout(resolve, lines[i].trim() ? 70 : 25));
    }
}

async function askDistrictInsight(questionOverride = '', options = {}) {
    const input = document.getElementById('insightQuestion');
    const log = document.getElementById('insightChatLog');
    if (!log) return;
    const q = String(questionOverride || (input && input.value) || '').trim();
    if (!q) return;
    ensureInsightCurrentQuestion(q);
    const waitingNode = createInsightWaitingAnimation(log, q);
    if (log.scrollHeight > log.clientHeight) { log.scrollTop = log.scrollHeight; }
    if (input && !options.keepInputValue) {
        input.value = '';
    }

    try {
        const res = await fetch(API_BASE + '/case-stats/district-insight/ask', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                question: q,
                inputs: {
                    default_limit: 20
                }
            })
        });
        const json = await res.json();
        const code = Number((json && json.code));
        const ok = json && (code === 0 || code === 200);
        const data = ok && json.data ? json.data : {};
        const analysisMarkdown = String(data.analysisMarkdown || data.answerMarkdown || data.markdown || data.answer || '');
        const renderMap = Number(data.renderMap || 0);
        const ratedItems = pickDistrictInsightItems(data);
        const contextDistrict = inferDistrictFromText([q, analysisMarkdown].join('\n'));
        const shouldRefreshMap = ok && (renderMap === 1 || ratedItems.length > 0);
        if (shouldRefreshMap && ratedItems.length) {
            const nextCount = {};
            const nextRated = {};
            const nextStreetItems = [];
            ratedItems.forEach((item) => {
                const normalized = normalizeDistrictInsightItem(item, contextDistrict);
                const district = normalized.district;
                const streetName = normalized.street_name;
                const metricValue = normalized.metric_value;

                if (streetName) {
                    nextStreetItems.push(normalized);
                }
                if (!district) {
                    return;
                }
                nextCount[district] = Number(nextCount[district] || 0) + metricValue;
                const prevRated = nextRated[district] || {};
                nextRated[district] = {
                    risk_rating: String((normalized.risk_rating || prevRated.risk_rating || 'R0')).toUpperCase(),
                    risk_reason: String(normalized.risk_reason || prevRated.risk_reason || ''),
                    assess_brief: String(normalized.assess_brief || prevRated.assess_brief || ''),
                    dimension_display: String(normalized.dimension_display || prevRated.dimension_display || '')
                };
            });
            districtInsightData = nextCount;
            districtInsightRatedMap = nextRated;
            districtInsightStreetItems = nextStreetItems;
            if (document.getElementById('shBubbleMapChart')) {
                await renderShanghaiBubbleMap(districtInsightData, districtInsightRatedMap, districtInsightStreetItems);
            } else {
                await renderShanghaiMap(districtInsightData, districtInsightRatedMap, districtInsightStreetItems);
                drawDistrictBarChart(districtInsightData);
                drawDistrictPieChart(districtInsightData);
            }
        }

        const answer = ok ? (analysisMarkdown || '已完成分析，但未返回可展示的结论。') : '问答失败：' + String((json && (json.message || json.msg)) || '未知错误');
        stopInsightWaitingAnimation(waitingNode);
        waitingNode.classList.remove('insight-chat-streaming');
        await renderInsightAnswerLineByLine(waitingNode, answer);
    } catch (e) {
        stopInsightWaitingAnimation(waitingNode);
        waitingNode.classList.remove('insight-chat-streaming');
        waitingNode.textContent = '问答失败：' + String((e && e.message) || '网络异常');
    }
    if (log.scrollHeight > log.clientHeight) { log.scrollTop = log.scrollHeight; }
}

async function triggerDefaultDistrictInsightQuestion() {
    const defaultQuestion = '统计各区域案件数量';
    const input = document.getElementById('insightQuestion');
    if (input && !String(input.value || '').trim()) {
        input.value = defaultQuestion;
    }
    ensureInsightCurrentQuestion(defaultQuestion);
    const log = document.getElementById('insightChatLog');
    ensureInsightEmptyState(log);
    await askDistrictInsight(defaultQuestion, { keepInputValue: true });
}

window.askDistrictInsight = askDistrictInsight;
window.triggerDefaultDistrictInsightQuestion = triggerDefaultDistrictInsightQuestion;
