import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach } from 'vitest';

// happy-dom has no real Web Animations; skip them in unit tests.
MotionGlobalConfig.skipAnimations = true;

afterEach(() => cleanup());
