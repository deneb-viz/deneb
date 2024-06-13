# `@deneb-viz/worker-spec-tokenizer`

Once we have tracking information for a spec, we need to be able to tokenize this with the correct metadata, where field names are used. This can be very expensive for extremely large specifications, so this is encapsulated as a web worker so that we can handle this on a separate thread.
