/**
 * productController.js
 * - Contains all handlers related to Product CRUD and reviews
 * - Controllers are wrapped in `catchAsyncError` to forward errors to central error middleware
 * - Uses APIFeatures utility to implement search, filter and pagination
 */
const Product = require("../models/productModel");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncError = require("../middlewares/catchAsyncError");
const APIFeatures = require("../utils/apiFeatures");

// Get Products - /api/v1/products
// - Supports keyword search, filters (price/category/ratings) and pagination
// - Uses APIFeatures utility to compose a Mongoose query based on req.query
exports.getProducts = catchAsyncError(async (req, res, next) => {
  const resPerPage = 8; // match frontend pagination

  // buildQuery returns an APIFeatures instance with the base query and the parsed request query
  let buildQuery = () => {
    return new APIFeatures(Product.find(), req.query).search().filter();
  };

  // Count how many products match the current filters (before pagination)
  const filteredProductsCount = await buildQuery().query.countDocuments({});
  const totalProductsCount = await Product.countDocuments({});
  let productsCount = totalProductsCount;

  // If filters are applied, show filtered count so frontend can reflect it
  if (filteredProductsCount !== totalProductsCount) {
    productsCount = filteredProductsCount;
  }

  // Apply pagination and sort by newest first (createdAt descending)
  const products = await buildQuery().paginate(resPerPage).query.sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: productsCount,
    resPerPage,
    products,
  });
});

// Create Product - /api/v1/product/new
// - Admin-only route (authorization enforced in route middleware)
// - Handles optional file uploads (multer) and converts uploaded files into public URLs
exports.newProduct = catchAsyncError(async (req, res, next) => {
  let images = [];
  // BASE_URL used to construct fully-qualified URLs for uploaded images
  let BASE_URL = process.env.BACKEND_URL;
  if (process.env.NODE_ENV === "production") {
    BASE_URL = `${req.protocol}://${req.get("host")}`;
  }

  // If files were uploaded using multer, build public URLs and store them in req.body.images
  if (req.files.length > 0) {
    req.files.forEach((file) => {
      let url = `${BASE_URL}/uploads/product/${file.filename}`;
      images.push({ image: url });
    });
  }

  req.body.images = images;

  // Attach the creator user id (available via auth middleware) and create the product
  req.body.user = req.user.id;
  const product = await Product.create(req.body);
  res.status(201).json({
    success: true,
    product,
  });
});

// Get Single Product - api/v1/product/:id
// - Populates the `reviews.user` field with name and email to show reviewer info
exports.getSingleProduct = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate(
    "reviews.user",
    "name email"
  );

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  res.status(200).json({
    success: true,
    product,
  });
});

// Update Product - api/v1/product/:id
// - Admin-only route. Supports replacing or keeping previously uploaded images
exports.updateProduct = catchAsyncError(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  // uploading images
  let images = [];

  // if images not cleared keep existing images (imagesCleared comes from client)
  if (req.body.imagesCleared === "false") {
    images = product.images;
  }
  let BASE_URL = process.env.BACKEND_URL;
  if (process.env.NODE_ENV === "production") {
    BASE_URL = `${req.protocol}://${req.get("host")}`;
  }

  // Append newly uploaded files if any
  if (req.files.length > 0) {
    req.files.forEach((file) => {
      let url = `${BASE_URL}/uploads/product/${file.filename}`;
      images.push({ image: url });
    });
  }

  req.body.images = images;

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    product,
  });
});

//Delete Product - api/v1/product/:id
exports.deleteProduct = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  await product.remove();

  res.status(200).json({
    success: true,
    message: "Product Deleted!",
  });
});

// Create Review - api/v1/review
// - Authenticated users can add or update a review for a product
// - Maintains numOfReviews and average rating
exports.createReview = catchAsyncError(async (req, res, next) => {
  const { productId, rating, comment } = req.body;

  const review = {
    user: req.user.id,
    rating,
    comment,
  };

  const product = await Product.findById(productId);
  // check if this user already reviewed this product
  const isReviewed = product.reviews.find((review) => {
    return review.user.toString() == req.user.id.toString();
  });

  if (isReviewed) {
    // update existing review
    product.reviews.forEach((review) => {
      if (review.user.toString() == req.user.id.toString()) {
        review.comment = comment;
        review.rating = rating;
      }
    });
  } else {
    // create a new review
    product.reviews.push(review);
    product.numOfReviews = product.reviews.length;
  }
  // recalculate average rating
  product.ratings =
    product.reviews.reduce((acc, review) => {
      return review.rating + acc;
    }, 0) / product.reviews.length;
  product.ratings = isNaN(product.ratings) ? 0 : product.ratings;

  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

//Get Reviews - api/v1/reviews?id={productId}
exports.getReviews = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.query.id).populate(
    "reviews.user",
    "name email"
  );

  res.status(200).json({
    success: true,
    reviews: product.reviews,
  });
});

//Delete Review - api/v1/review
exports.deleteReview = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.query.productId);

  //filtering the reviews which does match the deleting review id
  const reviews = product.reviews.filter((review) => {
    return review._id.toString() !== req.query.id.toString();
  });
  //number of reviews
  const numOfReviews = reviews.length;

  //finding the average with the filtered reviews
  let ratings =
    reviews.reduce((acc, review) => {
      return review.rating + acc;
    }, 0) / reviews.length;
  ratings = isNaN(ratings) ? 0 : ratings;

  //save the product document
  await Product.findByIdAndUpdate(req.query.productId, {
    reviews,
    numOfReviews,
    ratings,
  });
  res.status(200).json({
    success: true,
  });
});

// get admin products  - api/v1/admin/products
exports.getAdminProducts = catchAsyncError(async (req, res, next) => {
  const products = await Product.find();
  res.status(200).send({
    success: true,
    products,
  });
});
