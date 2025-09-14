"use client"

import React, { useState, useEffect } from 'react';
import { connectionMonitor, ConnectionStatus } from '@/lib/connection-monitor';
import { hybridDataService } from '@/lib/hybrid-data-service';
import { Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react';

export const ConnectionStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Initial status
    setStatus(connectionMonitor.getStatus());
    setPendingCount(hybridDataService.getPendingOperationsCount());

    // Listen for status changes
    const unsubscribe = connectionMonitor.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setPendingCount(hybridDataService.getPendingOperationsCount());
    });

    // Update pending count periodically
    const interval = setInterval(() => {
      setPendingCount(hybridDataService.getPendingOperationsCount());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: <Wifi className="h-4 w-4" />,
          text: 'En línea',
          bgColor: 'bg-green-500',
          textColor: 'text-green-700',
          description: 'Conectado a base de datos'
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: 'Reconectando',
          bgColor: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          description: 'Restaurando conexión'
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Modo Demo',
          bgColor: 'bg-red-500',
          textColor: 'text-red-700',
          description: 'Sin conexión - datos locales'
        };
      default:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Desconocido',
          bgColor: 'bg-gray-500',
          textColor: 'text-gray-700',
          description: 'Estado desconocido'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
        <div className={`w-2 h-2 rounded-full ${config.bgColor} ${status === 'reconnecting' ? 'animate-pulse' : ''}`} />
        {config.icon}
        <span className="text-sm font-medium text-white">
          {config.text}
        </span>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-orange-500/20 backdrop-blur-sm">
          <Clock className="h-3 w-3 text-orange-400" />
          <span className="text-xs font-medium text-orange-300">
            {pendingCount} pendientes
          </span>
        </div>
      )}
    </div>
  );
};