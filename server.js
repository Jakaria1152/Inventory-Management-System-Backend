const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const User = require('./models/User');
const Product = require('./models/Product');
const Discount = require('./models/Discount');
const ReturnRequest = require('./models/ReturnRequest');

const app = express();
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost/inventorymanagement').then(()=> console.log('Database Connected')).catch(err=>console.log(err));

// Registration
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    const user = new User({ username, password, role });
    await user.save();
    res.status(201).send('User registered');
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
        res.status(200).json({ message: 'Login successful', role: user.role });
    } else {
        res.status(400).send('Invalid credentials');
    }
});

// Middleware for admin check
// const isAdmin = async (req, res, next) => {
//     const { username } = req.body;
//     const user = await User.findOne({ username });
//     if (user && user.role === 'admin') {
//         next();
//     } else {
//         res.status(403).send('Forbidden');
//     }
// };

// Admin: Add product
app.post('/products', async (req, res) => {
    const { name, price, quantity } = req.body;
    const product = new Product({ name, price, quantity });
    await product.save();
    res.status(201).send('Product added');
});

// Admin: Update product
app.put('/products/:id',  async (req, res) => {
    const { id } = req.params;
    const { name, price, quantity } = req.body;
    await Product.findByIdAndUpdate(id, { name, price, quantity });
    res.send('Product updated');
});

// Admin: Delete product
app.delete('/products/:id',  async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.send('Product deleted');
});

// Admin: View products
app.get('/products',  async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// Admin: Add discount
app.post('/discounts', async (req, res) => {
    const { productId, requiredQuantity, freeProductId, freeQuantity } = req.body;
    const discount = new Discount({ productId, requiredQuantity, freeProductId, freeQuantity });
    await discount.save();
    res.status(201).send('Discount added');
});

// Admin: Update discount
app.put('/discounts/:id',  async (req, res) => {
    const { id } = req.params;
    const { productId, requiredQuantity, freeProductId, freeQuantity } = req.body;
    await Discount.findByIdAndUpdate(id, { productId, requiredQuantity, freeProductId, freeQuantity });
    res.send('Discount updated');
});

// Admin: Delete discount
app.delete('/discounts/:id',  async (req, res) => {
    const { id } = req.params;
    await Discount.findByIdAndDelete(id);
    res.send('Discount deleted');
});

// Admin: View discounts
app.get('/discounts',  async (req, res) => {
    const discounts = await Discount.find().populate('productId').populate('freeProductId');
    res.json(discounts);
});

// User: View products
app.get('/user/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// User: View discounts
app.get('/user/discounts', async (req, res) => {
    const discounts = await Discount.find().populate('productId').populate('freeProductId');
    res.json(discounts);
});

// User: Purchase product
app.post('/user/purchase', async (req, res) => {
    const { productId, quantity, userId } = req.body;

    const product = await Product.findById(productId);
    if (!product || product.quantity < quantity) {
        return res.status(400).send('Insufficient product quantity');
    }

    // Update product quantity
    product.quantity -= quantity;
    await product.save();

    // Check for discount
    const discount = await Discount.findOne({ productId, requiredQuantity: quantity });
    if (discount) {
        const freeProduct = await Product.findById(discount.freeProductId);
        freeProduct.quantity -= discount.freeQuantity;
        await freeProduct.save();
    }

    // Save purchase history (omitted for brevity)

    res.send('Purchase successful');
});

// User: Return product
app.post('/user/return', async (req, res) => {
    const { productId, quantity, userId } = req.body;

    // Validate return request (omitted for brevity)
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(400).send('Product not found');
    }

    const returnRequest = new ReturnRequest({
        userId,
        productId,
        quantity
    });
    await returnRequest.save();

    res.send('Return request submitted');
});

// Admin: View return requests
app.get('/admin/returns',  async (req, res) => {
    const returnRequests = await ReturnRequest.find().populate('userId').populate('productId');
    res.json(returnRequests);
});

// Admin: Accept return request
app.post('/admin/returns/:id/accept',  async (req, res) => {
    const { id } = req.params;

    const returnRequest = await ReturnRequest.findById(id).populate('productId');
    if (!returnRequest) {
        return res.status(400).send('Return request not found');
    }

    const purchaseHistory = await getPurchaseHistory(returnRequest.userId, returnRequest.productId);
    const totalPurchased = purchaseHistory.reduce((total, purchase) => total + purchase.quantity, 0);

    if (totalPurchased < returnRequest.quantity) {
        returnRequest.status = 'rejected';
        await returnRequest.save();
        return res.status(400).send('Return request rejected: Returned quantity exceeds purchased quantity');
    }

    returnRequest.productId.quantity += returnRequest.quantity;
    await returnRequest.productId.save();

    returnRequest.status = 'accepted';
    await returnRequest.save();

    res.send('Return request accepted');
});

// Admin: Reject return request
app.post('/admin/returns/:id/reject',  async (req, res) => {
    const { id } = req.params;

    const returnRequest = await ReturnRequest.findById(id);
    if (!returnRequest) {
        return res.status(400).send('Return request not found');
    }

    returnRequest.status = 'rejected';
    await returnRequest.save();

    res.send('Return request rejected');
});

// Mock function to get purchase history
const getPurchaseHistory = async (userId, productId) => {
    // In a real application, this would query the database
    return [{ productId, quantity: 4 }]; // Mock data
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
