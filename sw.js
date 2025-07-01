// FaviconSEOPro Service Worker
// 版本号，用于缓存管理
const CACHE_NAME = 'faviconseopro-v1.0.0';
const OFFLINE_URL = '/offline.html';

// 需要缓存的静态资源
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/styles.css',
    '/translations.js',
    '/site.webmanifest',
    '/favicon.ico',
    '/favicon.svg',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png'
];

// 安装事件 - 缓存核心资源
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static resources');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                // 立即激活新的 Service Worker
                return self.skipWaiting();
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // 立即控制所有客户端
                return self.clients.claim();
            })
    );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
    // 只处理同源请求
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // 忽略POST请求和其他非GET请求
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // 如果有缓存，直接返回
                if (cachedResponse) {
                    return cachedResponse;
                }

                // 尝试网络请求
                return fetch(event.request)
                    .then(response => {
                        // 检查响应是否有效
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 克隆响应用于缓存
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // 只缓存GET请求的HTML、CSS、JS、图片等资源
                                if (event.request.url.match(/\.(html|css|js|png|jpg|jpeg|gif|svg|ico|webp)$/)) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return response;
                    })
                    .catch(() => {
                        // 网络失败时的后备方案
                        if (event.request.destination === 'document') {
                            return caches.match('/') || new Response('网络连接失败，请检查网络设置', {
                                status: 200,
                                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                            });
                        }
                        
                        // 对于图片请求，返回一个占位符
                        if (event.request.destination === 'image') {
                            return new Response('<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" fill="#999">离线</text></svg>', {
                                headers: { 'Content-Type': 'image/svg+xml' }
                            });
                        }
                    });
            })
    );
});

// 后台同步（如果支持）
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('Background sync triggered');
        // 这里可以处理离线时的操作队列
    }
});

// 推送通知（如果需要）
self.addEventListener('push', event => {
    console.log('Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'FaviconSEOPro 有新的更新！',
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '查看更新',
                icon: '/android-chrome-192x192.png'
            },
            {
                action: 'close',
                title: '关闭',
                icon: '/favicon-32x32.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('FaviconSEOPro', options)
    );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
    console.log('Notification click received');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// 消息处理
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});