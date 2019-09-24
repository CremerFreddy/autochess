using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class healthbar : MonoBehaviour
{
    public Text textfield;
    public AI owner;
    // Start is called before the first frame update
    void Start()
    {
        updateText();
    }

    // Update is called once per frame
    void Update()
    {
        Vector3 manipulatedPos = new Vector3(owner.transform.position.x + 1.5f, owner.transform.position.y, owner.transform.position.z);
        Vector3 namepos = Camera.main.WorldToScreenPoint(manipulatedPos);
        textfield.transform.position = namepos;
    }
    public void updateText()
    {
        textfield.text = owner.health.ToString() + "/" + owner.maxhealth.ToString();
    }
}
