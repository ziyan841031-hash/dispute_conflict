// 基础配置和全局变量
// const API_BASE = 'http://localhost:8288/dispute/api';
const API_BASE = 'https://demo.handydata.cn/dispute/api';

// 解析状态
const parseStatus = {
    audio: false,
    text: false,
    classify: false
};

let casesPageNo = 1;
let casesTotal = 0;
let casesPages = 1;
let casesPageSize = 20;
const EXCEL_BATCH_WAIT_MS = 12 * 60 * 1000;
const AUDIO_INGEST_WAIT_MS = 30 * 60 * 1000;
let excelSubmitting = false;

// 上传文件预览URL缓存
const uploadPreviewUrls = {};

// 助手页面相关全局变量
const assistantGuideNotes = [];
let assistantDataCache = {};
const caseListCache = {};
let disposalOrgOptions = [];
let currentWorkflowNodeId = 'accept';
const selectedOrgByCategory = {};
let workflowAdviceRecord = null;
let workflowAdviceLoading = false;
let assistantInitialWorkflowDone = false;
let assistantCanvasReady = false;
let timelineTickTimer = null;
const THIRD_LEVEL_NODE_MAP = {
    people: '人民调解',
    admin: '行政调解',
    professional: '专业调解'
};

// 法律服务对话相关全局变量
let lawAgentRole = '普通群众';
let lawAgentLoginToken = '';
let lawAgentRequestType = 0;
let lawAgentLastRawResponse = '0';
let lawAgentChatPending = false;
let lawAgentRecommendPending = false;
let lawAgentApiPending = false;
let lawAgentAnswerEventSource = null;

// 区域洞察相关全局变量
let districtInsightData = {};
let districtInsightRatedMap = {};
let districtInsightStreetItems = [];
let shMapChart = null;
let shMapScene = null;
let shMapLayers = [];
let shBubbleMapScene = null;
let shBubbleMapLayers = [];

// 线索管理相关全局变量
let clueFormEditingId = null;

// 其他全局变量
let homeToolLoadTimer = null;
let homeToolLoadDone = false;
let currentCaseOptimizeData = null;
let caseAudioPlayer = null;
let currentCaseAudioUrl = "";
let caseAudioCountdownTimer = null;
let caseOptimizeSubmitting = false;
