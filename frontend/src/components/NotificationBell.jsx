import { useState, useEffect } from 'react';
import {
  pushSupported,
  registerServiceWorker,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
} from '../utils/push';

export default function NotificationBell() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const init = async () => {
      const supp = pushSupported();
      setSupported(supp);
      if (!supp) return;
      setPermission(Notification.permission);
      await registerServiceWorker();
      const sub = await getCurrentSubscription();
      setEnabled(!!sub && Notification.permission === 'granted');
    };
    init();
  }, []);

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      await subscribeToPush();
      setEnabled(true);
      setPermission('granted');
      flash('Notifications enabled ✓');
    } catch (e) {
      flash(e.message || 'Failed to enable');
      setPermission(Notification.permission);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      setEnabled(false);
      flash('Notifications disabled');
    } catch (e) {
      flash('Failed to disable');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const result = await sendTestNotification();
      if (result.sent > 0) flash('Test sent — check your notifications');
      else flash('Not subscribed on this device');
    } catch (e) {
      flash('Failed to send test');
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="text-xs text-gray-400 p-3 bg-gray-50 rounded-lg">
        Push notifications not supported on this browser.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{enabled ? '🔔' : '🔕'}</span>
          <div>
            <div className="text-sm font-semibold text-gray-900">Push Notifications</div>
            <div className="text-xs text-gray-500">
              {enabled
                ? 'You\'ll get alerts when rent is due & new expenses'
                : permission === 'denied'
                  ? 'Blocked in browser — enable in site settings'
                  : 'Get alerts even when the app is closed'}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {enabled ? (
            <>
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
              >
                Test
              </button>
              <button
                onClick={handleDisable}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Disable
              </button>
            </>
          ) : (
            <button
              onClick={handleEnable}
              disabled={loading || permission === 'denied'}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
            >
              {loading ? '...' : 'Enable'}
            </button>
          )}
        </div>
      </div>
      {msg && <div className="text-xs text-gray-600 mt-2 bg-gray-50 rounded px-2 py-1">{msg}</div>}
    </div>
  );
}
