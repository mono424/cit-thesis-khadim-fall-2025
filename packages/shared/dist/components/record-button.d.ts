import { Component } from 'solid-js';
import { StartStalkerSessionTrigger } from '..';
export declare const RecordButton: Component<{
    seconds: () => number;
    startStalkerSessionTriggers: () => StartStalkerSessionTrigger[];
    serverCsv?: () => string;
    onStartMetricRecording?: () => void;
}>;
