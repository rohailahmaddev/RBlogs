import bcrypt from 'bcrypt';
import pool from "../database/index.contentDB.js"
import jwt from "jsonwebtoken"
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

export const getBlogs = async (req, res) => {
  try {
    const [blogs] = await pool.query(
      `SELECT 
      id,
      title,
      body,
      author_name,
      image_url,
      created_at
   FROM blogs
   ORDER BY created_at DESC`
      );

    return res.status(200).json({ data: blogs });

  } catch (err) {
    console.error("getBlogs error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getSingleBlog = async (req, res) => {
  try {
    const { id } = req.params
    const [blogs] = await pool.query(
      `SELECT id,image_url, title, body,author_name, created_at
       FROM blogs
       WHERE id = ?`, [id]
    );
    if (blogs.length === 0) {
      return res.status(404).json({ message: "blog not found" })
    }

    const [related] = await pool.query(
      `SELECT 
      id,
      title,
      body,
      author_name,
      image_url,
      created_at
   FROM blogs
   WHERE id != ?
   ORDER BY created_at DESC
   LIMIT 4
   `,
      [id]
    )



    return res.status(200).json({ data: blogs[0], related });
  } catch (err) {
    console.error("getBlogs error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const registerUser = async (req, res) => {
  try {
    console.log(req.body)
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const [rows] = await pool.query(
      'SELECT id FROM user WHERE email = ?',
      [email]
    );

    if (rows.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO user (username, email, password) VALUES (?, ?, ?)',
      [name, email, hashed_password]
    );

    return res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId,
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM `user` WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    return res.status(200).json({
      message: 'Login successful',
      user: {
        name: user.username,
        role: user.role
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: err.message });
  }
};

export const addBlog = async (req, res) => {
  let image;

  try {
    const { title, body, author_name } = req.body;

    if (!title || !body || !author_name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const fileBuffer = req.file?.buffer;

    if (fileBuffer) {
      try {
        image = await uploadOnCloudinary(fileBuffer, "blogs");
      } catch (error) {
        return res.status(500).json({ message: error.message });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO blogs (title, body, author_name, image_url, image_public_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        title,
        body,
        author_name,
        image?.secure_url || null,
        image?.public_id || null
      ]
    );

    return res.status(201).json({
      message: "Blog created",
      id: result.insertId
    });

  } catch (err) {
    console.error("addBlog error:", err);

    // optional cleanup (only if upload succeeded)
    if (image?.public_id) {
      await deleteFromCloudinary(image.public_id);
    }

    return res.status(500).json({
      message: err.message
    });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  })
  return res.status(200).json({ message: 'Logged out' })
}

export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params

    const [blog] = await pool.query(
      'SELECT id FROM blogs WHERE id = ?', [id]
    )

    if (blog.length === 0) {
      return res.status(404).json({ message: 'Blog not found' })
    }

    await pool.query('DELETE FROM blogs WHERE id = ?', [id])

    return res.status(200).json({ message: 'Blog deleted successfully' })

  } catch (err) {
    console.error('deleteBlog error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, author_name, remove_image, existing_image_url } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Blog ID is required" });
    }

    if (!title || !body || !author_name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // fetch current blog to get old cloudinary public_id
    const [[currentBlog]] = await pool.query(
      `SELECT image_url, image_public_id FROM blogs WHERE id = ?`,
      [id]
    );

    if (!currentBlog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    let image_url = currentBlog.image_url;
    let image_public_id = currentBlog.image_public_id;

    if (req.file?.buffer) {
      // user uploaded a new image — delete old one then upload new
      if (currentBlog.image_public_id) {
        await cloudinary.uploader.destroy(currentBlog.image_public_id);
      }
      const uploaded = await uploadOnCloudinary(req.file.buffer, "blogs");
      image_url = uploaded.secure_url;
      image_public_id = uploaded.public_id;

    } else if (remove_image === "true") {
      // user explicitly removed the image
      if (currentBlog.image_public_id) {
        await cloudinary.uploader.destroy(currentBlog.image_public_id);
      }
      image_url = null;
      image_public_id = null;

    } else if (existing_image_url) {
      // user didn't touch the image — keep as-is
      image_url = existing_image_url;
      image_public_id = currentBlog.image_public_id;
    }

    const [result] = await pool.query(
      `UPDATE blogs 
       SET title = ?, body = ?, author_name = ?, image_url = ?, image_public_id = ?
       WHERE id = ?`,
      [title, body, author_name, image_url, image_public_id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    return res.status(200).json({ message: "Blog updated successfully" });

  } catch (err) {
    console.error("updateBlog error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};