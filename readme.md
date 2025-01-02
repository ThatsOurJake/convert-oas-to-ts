# Convert OpenAPI Spec to TypeScript

The project has the following aims
- Parse open api spec into nice types
  - Other repos I've found don't work all to well for me
  - _Note_ These types are expanding based on files I put through the parser and every type has not been written to the main spec (I dont have time for that)
- Take in these parsed types and send them to the typescript compiler to get a typescript declaration string that can be saved to the file system

## Example
Input: [PetStore Swagger YAML](https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml)
Output:
```ts
interface Order {
  id: number;
  petId: number;
  quantity: number;
  shipDate: string;
  status: string;
  complete: boolean;
}
interface Customer {
  id: number;
  username: string;
  address: Address[];
}
interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}
interface Category {
  id: number;
  name: string;
}
interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  userStatus: number;
}
interface Tag {
  id: number;
  name: string;
}
interface Pet {
  id: number;
  name: string;
  category: Category;
  photoUrls: string[];
  tags: Tag[];
  status: string;
}
interface ApiResponse {
  code: number;
  type: string;
  message: string;
}
interface PetReqResPost {
  request: Pet;
  response: {
      "200": Pet;
      "405": unknown;
  };
}
interface PetReqResPut {
  request: Pet;
  response: {
      "200": Pet;
      "400": unknown;
      "404": unknown;
      "405": unknown;
  };
}
interface PetReqRes {
  post: PetReqResPost;
  put: PetReqResPut;
}
interface PetFindByStatusReqResGet {
  response: {
      "200": Pet[];
      "400": unknown;
  };
}
interface PetFindByStatusReqRes {
  get: PetFindByStatusReqResGet;
}
interface PetFindByTagsReqResGet {
  response: {
      "200": Pet[];
      "400": unknown;
  };
}
interface PetFindByTagsReqRes {
  get: PetFindByTagsReqResGet;
}
interface PetPetIdReqResGet {
  response: {
      "200": Pet;
      "400": unknown;
      "404": unknown;
  };
}
interface PetPetIdReqResPost {
  response: {
      "405": unknown;
  };
}
interface PetPetIdReqResDelete {
  response: {
      "400": unknown;
  };
}
interface PetPetIdReqRes {
  get: PetPetIdReqResGet;
  post: PetPetIdReqResPost;
  delete: PetPetIdReqResDelete;
}
interface PetPetIdUploadImageReqResPost {
  request: string;
  response: {
      "200": ApiResponse;
  };
}
interface PetPetIdUploadImageReqRes {
  post: PetPetIdUploadImageReqResPost;
}
interface StoreInventoryReqResGetResponse200 {
  StoreInventoryReqResGetResponse200: unknown;
}
interface StoreInventoryReqResGet {
  response: {
      "200": StoreInventoryReqResGetResponse200;
  };
}
interface StoreInventoryReqRes {
  get: StoreInventoryReqResGet;
}
interface StoreOrderReqResPost {
  request: Order;
  response: {
      "200": Order;
      "405": unknown;
  };
}
interface StoreOrderReqRes {
  post: StoreOrderReqResPost;
}
interface StoreOrderOrderIdReqResGet {
  response: {
      "200": Order;
      "400": unknown;
      "404": unknown;
  };
}
interface StoreOrderOrderIdReqResDelete {
  response: {
      "400": unknown;
      "404": unknown;
  };
}
interface StoreOrderOrderIdReqRes {
  get: StoreOrderOrderIdReqResGet;
  delete: StoreOrderOrderIdReqResDelete;
}
interface UserReqResPost {
  request: User;
  response: {
      "default": User;
  };
}
interface UserReqRes {
  post: UserReqResPost;
}
interface UserCreateWithListReqResPost {
  request: User[];
  response: {
      "200": User;
      "default": unknown;
  };
}
interface UserCreateWithListReqRes {
  post: UserCreateWithListReqResPost;
}
interface UserLoginReqResGet {
  response: {
      "200": string;
      "400": unknown;
  };
}
interface UserLoginReqRes {
  get: UserLoginReqResGet;
}
interface UserLogoutReqResGet {
  response: {
      "default": unknown;
  };
}
interface UserLogoutReqRes {
  get: UserLogoutReqResGet;
}
interface UserUsernameReqResGet {
  response: {
      "200": User;
      "400": unknown;
      "404": unknown;
  };
}
interface UserUsernameReqResPut {
  request: User;
  response: {
      "default": unknown;
  };
}
interface UserUsernameReqResDelete {
  response: {
      "400": unknown;
      "404": unknown;
  };
}
interface UserUsernameReqRes {
  get: UserUsernameReqResGet;
  put: UserUsernameReqResPut;
  delete: UserUsernameReqResDelete;
}
interface SwaggerPetstoreOpenAPI3_0 {
  title: "Swagger Petstore - OpenAPI 3.0";
  version: "1.0.20-SNAPSHOT";
  Pet: PetReqRes;
  PetFindByStatus: PetFindByStatusReqRes;
  PetFindByTags: PetFindByTagsReqRes;
  PetPetId: PetPetIdReqRes;
  PetPetIdUploadImage: PetPetIdUploadImageReqRes;
  StoreInventory: StoreInventoryReqRes;
  StoreOrder: StoreOrderReqRes;
  StoreOrderOrderId: StoreOrderOrderIdReqRes;
  User: UserReqRes;
  UserCreateWithList: UserCreateWithListReqRes;
  UserLogin: UserLoginReqRes;
  UserLogout: UserLogoutReqRes;
  UserUsername: UserUsernameReqRes;
}
```

## Future Improvements
- Better handle multiple content-types for responses
  - As you can see above multipart and json produce a union of types for "200" response
- Required and Optional types
  - Reflect the optional properties using the `required` field in the spec
- Linting the output to ensure better readability
- JS/TS Doc comments using the `description` fields
- Parameters for GET requests
