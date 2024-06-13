# `@deneb-viz/worker-spec-fields-in-use`

To ensure that we understand which dataset fields are included in a JSON spec, we need to process it. This can be very expensive for extremely large specifications, so this is encapsulated as a web worker so that we can handle this on a separate thread.
