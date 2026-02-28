/**
 * Rakko Interconnect Service
 * 
 * LAN broadcast service for sharing currently playing track info and lyrics
 * with pairing support, master/slave roles, and third-party app integration.
 * 
 * @module RakkoInterconnect
 */

// Types
export type {
    InterconnectRole,
    ConnectionState,
    PairingState,
    PeerInfo,
    BroadcastSongInfo,
    TrackBroadcast,
    LyricsBroadcast,
    PlaybackBroadcast,
    InterconnectMessage,
    InterconnectEvents,
    InterconnectConfig,
    InterconnectCommand,
    UseInterconnectOptions,
    UseInterconnectReturn,
} from './types';

// Pairing Service
export {
    generatePairingCode,
    validatePairingCode,
    checkCodeCollision,
    generateUniqueCode,
    getOrCreatePairingCode,
    savePairingCode,
    clearPairingCode,
    generatePeerId,
    getOrCreatePeerId,
    getDefaultDeviceName,
} from './pairingService';

// Core Service
export {
    InterconnectService,
    getInterconnectService,
    destroyInterconnectService,
} from './interconnectService';

// React Hook
export { useRakkoInterconnect } from './useRakkoInterconnect';

// Third-Party API
export {
    initThirdPartyAPI,
    getThirdPartyAPI,
} from './thirdPartyAPI';
