import React, { useState } from 'react';
import dayjs from 'dayjs';

function formatTimestamp(ts) {
  return dayjs.unix(ts).format('YYYY-MM-DD HH:mm');
}

export default function ListenersList({ listeners }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!listeners || listeners.length === 0) {
    return <div className="text-gray-500 text-center py-6 text-sm">No listeners found.</div>;
  }

  return (
    <div className="flex flex-col px-2 sm:px-0">
      {listeners.map((listener) => {
        const panelId = `listener-panel-${listener.id}`;
        return (
          <div
            key={listener.id}
            className={`border shadow bg-white hover:shadow-lg transition-shadow duration-200 mb-3 ${
              expandedId === listener.id ? 'ring-2 ring-blue-200' : ''
            }`}
          >
            <button
              className="border-none bg-white w-full flex justify-between items-center px-3 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={() => setExpandedId(expandedId === listener.id ? null : listener.id)}
              aria-expanded={expandedId === listener.id}
              aria-controls={panelId}
              aria-label={`Expand details for listener ${listener.name}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-gray-900 flex items-center gap-2 truncate">
                  <span className="truncate">{listener.name}</span>
                  {listener.enabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">Enabled</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">Disabled</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1 truncate">
                  <span className="font-medium">Event:</span> {listener.event} &bull; <span className="font-medium">Action:</span> {listener.action}
                </div>
                <div className="text-xs text-gray-400 mt-1 truncate">
                  <span className="font-medium">Connection:</span> {listener.connection?.name || '-'} ({listener.connection?.type || '-'})
                </div>
              </div>
              <span className="ml-2 text-gray-400 text-xl flex-shrink-0" aria-hidden>
                {expandedId === listener.id ? '−' : '+'}
              </span>
            </button>
            <div
              id={panelId}
              className={`overflow-hidden transition-all duration-300 ${expandedId === listener.id ? 'max-h-[1000px]' : 'max-h-0'}`}
              aria-hidden={expandedId !== listener.id}
            >
              {expandedId === listener.id && (
                <div className="px-3 pb-3 bg-blue-50 text-xs">
                  <div className="text-gray-700 mb-1">
                    <b>Listener ID:</b> {listener.id}
                  </div>
                  <div className="text-gray-700 mb-1">
                    <b>Created:</b> {formatTimestamp(listener.createdAt)}
                  </div>
                  <div className="text-gray-700 mb-1">
                    <b>Updated:</b> {formatTimestamp(listener.updatedAt)}
                  </div>
                  <div className="text-gray-700 mb-1">
                    <b>Partner Connection ID:</b> {listener.partnerConnectionID}
                  </div>
                  <div className="text-gray-700 mb-1 break-all">
                    <b>Connection Webhook:</b>{' '}
                    <a
                      href={listener.connection?.settings?.webhook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      {listener.connection?.settings?.webhook}
                    </a>
                  </div>
                  <div className="text-gray-700 mt-2">
                    <b>Settings:</b>
                    <pre className="bg-gray-100 rounded p-2 mt-1 text-xs overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(listener.settings, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 