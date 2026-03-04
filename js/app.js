/**
 * Feile 生日祝福网站 - 主应用逻辑
 */

// 应用状态
const AppState = {
    currentPage: 'home',
    musicPlaying: false,
    gestureMode: 'camera', // 'camera' | 'touch'
    photos: [
        'pic/外链含义及数据解读.png',
        'pic/外链含义及数据解读 (2).png',
        'pic/微信图片_20260304193300_4177_306.jpg',
        'pic/合照放最后.png'
    ]
};

// DOM 元素
const elements = {
    pages: {
        home: document.getElementById('page-home'),
        loading: document.getElementById('page-loading'),
        gesture: document.getElementById('page-gesture'),
        ending: document.getElementById('page-ending')
    },
    btnMagic: document.getElementById('btn-magic'),
    btnMusic: document.getElementById('btn-music'),
    btnShare: document.getElementById('btn-share'),
    btnReplay: document.getElementById('btn-replay'),
    bgMusic: document.getElementById('bg-music'),
    progressFill: document.getElementById('progress-fill'),
    wechatTip: document.getElementById('wechat-tip')
};

/**
 * 页面切换
 */
function showPage(pageName) {
    // 隐藏所有页面
    Object.values(elements.pages).forEach(page => {
        page.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = elements.pages[pageName];
    if (targetPage) {
        targetPage.classList.add('active');
        AppState.currentPage = pageName;

        // 页面特定逻辑
        switch(pageName) {
            case 'loading':
                startLoading();
                break;
            case 'gesture':
                initGesturePage();
                break;
            case 'ending':
                initEndingPage();
                break;
        }
    }
}

/**
 * 加载页逻辑
 */
function startLoading() {
    let progress = 0;
    const duration = 2000; // 2秒
    const interval = 50;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
        progress += step;
        if (progress >= 100) {
            progress = 100;
            clearInterval(timer);
            setTimeout(() => {
                showPage('gesture');
            }, 300);
        }
        elements.progressFill.style.width = progress + '%';
    }, interval);
}

/**
 * 互动页初始化
 */
function initGesturePage() {
    // 延迟初始化摄像头，确保页面已显示
    setTimeout(() => {
        if (window.GestureController) {
            window.GestureController.init();
        }
    }, 500);
}

/**
 * 结尾页初始化
 */
function initEndingPage() {
    // 初始化烟花动画
    if (window.Fireworks) {
        window.Fireworks.start();
    }

    // 播放音乐（如果还没播放）
    if (!AppState.musicPlaying) {
        toggleMusic();
    }
}

/**
 * 音乐控制
 */
function toggleMusic() {
    const music = elements.bgMusic;
    const btn = elements.btnMusic;

    if (AppState.musicPlaying) {
        music.pause();
        btn.classList.remove('playing');
        AppState.musicPlaying = false;
    } else {
        music.play().then(() => {
            btn.classList.add('playing');
            AppState.musicPlaying = true;
        }).catch(err => {
            console.log('音乐播放失败:', err);
        });
    }
}

/**
 * 检测微信环境
 */
function checkWechat() {
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);
    if (isWechat) {
        elements.wechatTip.style.display = 'flex';
    }
}

/**
 * 分享功能
 */
function sharePage() {
    if (navigator.share) {
        navigator.share({
            title: '祝菲乐生日快乐！',
            text: '一份特别的生日祝福，请查收～',
            url: window.location.href
        }).catch(err => {
            console.log('分享取消:', err);
        });
    } else {
        // 复制链接到剪贴板
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('链接已复制，快去分享给朋友吧！');
        }).catch(() => {
            alert('链接: ' + window.location.href);
        });
    }
}

/**
 * 事件绑定
 */
function bindEvents() {
    // 魔法按钮 - 进入加载页
    elements.btnMagic.addEventListener('click', () => {
        showPage('loading');
    });

    // 音乐按钮
    elements.btnMusic.addEventListener('click', toggleMusic);

    // 分享按钮
    elements.btnShare.addEventListener('click', sharePage);

    // 再玩一次
    elements.btnReplay.addEventListener('click', () => {
        // 重置手势状态
        if (window.GestureController) {
            window.GestureController.reset();
        }
        showPage('gesture');
    });

    // 微信提示点击关闭
    elements.wechatTip.addEventListener('click', () => {
        elements.wechatTip.style.display = 'none';
    });
}

/**
 * 尝试自动播放音乐
 */
function autoPlayMusic() {
    const music = elements.bgMusic;
    const btn = elements.btnMusic;

    // 设置音量为较低
    music.volume = 0.6;

    music.play().then(() => {
        btn.classList.add('playing');
        AppState.musicPlaying = true;
        console.log('✅ 音乐自动播放成功');
    }).catch(err => {
        console.log('⚠️ 自动播放被阻止，等待用户交互:', err);
        // 如果自动播放失败，在第一次点击时播放
        document.addEventListener('click', function playOnFirstClick() {
            if (!AppState.musicPlaying) {
                toggleMusic();
            }
            document.removeEventListener('click', playOnFirstClick);
        }, { once: true });
    });
}

/**
 * 初始化
 */
function init() {
    console.log('🎂 Feile 生日祝福网站 初始化...');

    // 检测微信
    checkWechat();

    // 绑定事件
    bindEvents();

    // 初始化 Cover Flow（在 coverflow.js 中实现）
    if (window.initCoverFlow) {
        window.initCoverFlow(AppState.photos);
    }

    // 自动播放音乐（延迟一点确保页面已渲染）
    setTimeout(autoPlayMusic, 500);

    console.log('✅ 初始化完成');
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 导出全局函数
window.showPage = showPage;
window.toggleMusic = toggleMusic;
