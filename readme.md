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
interface PetPost {
    request: Pet | Pet | Pet;
    response: {
        "200": Pet;
        "200": Pet;
        "405": unknown;
    };
}
interface PetPut {
    request: Pet | Pet | Pet;
    response: {
        "200": Pet;
        "200": Pet;
        "400": unknown;
        "404": unknown;
        "405": unknown;
    };
}
interface Pet {
    post: PetPost;
    put: PetPut;
}
interface PetFindByStatusGet {
    response: {
        "200": Pet[];
        "200": Pet[];
        "400": unknown;
    };
}
interface PetFindByStatus {
    get: PetFindByStatusGet;
}
interface PetFindByTagsGet {
    response: {
        "200": Pet[];
        "200": Pet[];
        "400": unknown;
    };
}
interface PetFindByTags {
    get: PetFindByTagsGet;
}
interface PetPetIdGet {
    response: {
        "200": Pet;
        "200": Pet;
        "400": unknown;
        "404": unknown;
    };
}
interface PetPetIdPost {
    response: {
        "405": unknown;
    };
}
interface PetPetIdDelete {
    response: {
        "400": unknown;
    };
}
interface PetPetId {
    get: PetPetIdGet;
    post: PetPetIdPost;
    delete: PetPetIdDelete;
}
type PetPetIdUploadImagePostPayload = string;
interface PetPetIdUploadImagePost {
    request: PetPetIdUploadImagePostPayload;
    response: {
        "200": ApiResponse;
    };
}
interface PetPetIdUploadImage {
    post: PetPetIdUploadImagePost;
}
interface StoreInventoryGetResponse200 {
    StoreInventoryGetResponse200: unknown;
}
interface StoreInventoryGet {
    response: {
        "200": StoreInventoryGetResponse200;
    };
}
interface StoreInventory {
    get: StoreInventoryGet;
}
interface StoreOrderPost {
    request: Order | Order | Order;
    response: {
        "200": Order;
        "405": unknown;
    };
}
interface StoreOrder {
    post: StoreOrderPost;
}
interface StoreOrderOrderIdGet {
    response: {
        "200": Order;
        "200": Order;
        "400": unknown;
        "404": unknown;
    };
}
interface StoreOrderOrderIdDelete {
    response: {
        "400": unknown;
        "404": unknown;
    };
}
interface StoreOrderOrderId {
    get: StoreOrderOrderIdGet;
    delete: StoreOrderOrderIdDelete;
}
interface UserPost {
    request: User | User | User;
    response: {
        "default": User;
        "default": User;
    };
}
interface User {
    post: UserPost;
}
User[]
interface UserCreateWithListPost {
    request: UserCreateWithListPostPayload;
    response: {
        "200": User;
        "200": User;
        "default": unknown;
    };
}
interface UserCreateWithList {
    post: UserCreateWithListPost;
}
interface UserLoginGet {
    response: {
        "200";
        "200";
        "400": unknown;
    };
}
interface UserLogin {
    get: UserLoginGet;
}
interface UserLogoutGet {
    response: {
        "default": unknown;
    };
}
interface UserLogout {
    get: UserLogoutGet;
}
interface UserUsernameGet {
    response: {
        "200": User;
        "200": User;
        "400": unknown;
        "404": unknown;
    };
}
interface UserUsernamePut {
    request: User | User | User;
    response: {
        "default": unknown;
    };
}
interface UserUsernameDelete {
    response: {
        "400": unknown;
        "404": unknown;
    };
}
interface UserUsername {
    get: UserUsernameGet;
    put: UserUsernamePut;
    delete: UserUsernameDelete;
}
interface SwaggerPetstoreOpenAPI3.0 {
    title: "Swagger Petstore - OpenAPI 3.0";
    version: "1.0.20-SNAPSHOT";
    Pet: Pet;
    PetFindByStatus: PetFindByStatus;
    PetFindByTags: PetFindByTags;
    PetPetId: PetPetId;
    PetPetIdUploadImage: PetPetIdUploadImage;
    StoreInventory: StoreInventory;
    StoreOrder: StoreOrder;
    StoreOrderOrderId: StoreOrderOrderId;
    User: User;
    UserCreateWithList: UserCreateWithList;
    UserLogin: UserLogin;
    UserLogout: UserLogout;
    UserUsername: UserUsername;
}
```

## Future Improvements
- Handle multiple content-types for responses
  - As you can see above multipart and json produce two "200" responses
- Required and Optional types
  - Reflect the optional properties using the `required` field in the spec
- Linting the output to ensure better readability
- JS/TS Doc comments using the `description` fields
