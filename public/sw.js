// 서비스워커: 앱이 꺼져 있어도 푸시 알림을 받아서 화면에 띄워 주는 작은 프로그램이에요.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      vibrate: [200, 100, 200],
      data: { url: data.url || "/" },
    })
  );
});

// 알림을 누르면 앱을 열어 줘요.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
