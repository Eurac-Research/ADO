import fs from 'fs'
import matter from 'gray-matter'
import { join } from 'path'

const postsDirectory = join(process.cwd(), 'public/markdown/navigation-items')

console.log("cur: ", process.cwd());


export function getAllFiles() {
  return fs.readdirSync(postsDirectory)
}


export function getPostBySlug(slug) {
  console.log("slug", slug);
  const realSlug = slug.toString().replace(/\.md$/, '')
  const fullPath = join(postsDirectory, `${realSlug}.md`)

  console.log(fullPath);
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)
  const items = {}

  // Ensure only the minimal needed data is exposed
  /*   fields.forEach((field) => {
      if (field === 'slug') {
        items[field] = realSlug
      }
      if (field === 'content') {
        items[field] = content
      }
  
      if (typeof data[field] !== 'undefined') {
        items[field] = data[field]
      }
    })
   */
  return items
}


export function getAllPosts() {
  const slugs = getAllFiles()
  return slugs
}