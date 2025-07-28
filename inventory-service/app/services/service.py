
def build_category_tree_by_id(categories, root_id):
    lookup = {cat.id: cat for cat in categories}

    def recurse(current_id):
        category = lookup.get(current_id)
        if not category:
            return None

        # Recursively fetch subcategories
        subcats = []
        if category.sub_categories:
            for sub_id in category.sub_categories:
                result = recurse(sub_id)
                if result:
                    subcats.append(result)

        print("subcats - ", subcats)
        return {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "slug": category.slug,
            "subCategories": subcats
        }

    return recurse(root_id)


def build_category_tree(categories, category_id):
    tree = []

    if category_id is not None and category_id != "":
        # Build tree for the given category_id
        node = build_category_tree_by_id(categories, category_id)
        print("node - ", node)
        tree.append(node)
    else:
        # Build tree for all root categories
        for category in categories:
            node = build_category_tree_by_id(categories, category.id)
            print("node - ", node)
            tree.append(node)

    return tree

