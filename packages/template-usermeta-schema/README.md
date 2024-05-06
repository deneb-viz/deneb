# `@deneb-viz/template-usermeta-schema`

API for working with Deneb's template metadata, which is supplied in the `usermeta` object in a [Vega](https://vega.github.io/vega/) or [Vega-Lite](https://vega.github.io/vega-lite/) specification. The `usermeta` object has no effect on the behavior or parsing of a specification, but is used to indicate that the specification is a valid Deneb template.

This package is responsible for the production of the JSON schema used to validate this metadata, exists to ensure that there are no circular internal dependencies and contains no other logic.

## JSON Schema

The dev and build process will also compile the interfaces to a JSON schema that you can also use for validation of the structure. This is output to `dist/deneb-template-usermeta.json`. This can be used in tools such as [Ajv](https://ajv.js.org/) to validate an object against the schema if needed.

#### For Developers of this Module

Because we are trying to consolidate all declarations in `@deneb-viz/core-dependencies`, the typings are also contained in that package. To keep the build process localized to this package, the root type is exported in [`./src/schema.ts`](./src/schema.ts), and this is referred to by the `schemagen:template-usermeta` npm task. The monorepo `dev` and `build` tasks also just point to this.
