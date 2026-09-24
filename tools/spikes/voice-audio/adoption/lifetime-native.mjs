// Native source is copied byte-for-byte except its registration becomes an export.
import { LikecordCaptureV1 } from '../dist/va3b-lifetime-memory-final/native-base.mjs';
import { lifetimeProcessor } from './lifetime-processor.mjs';
registerProcessor('va3b-lifetime',lifetimeProcessor(LikecordCaptureV1,null,null));
